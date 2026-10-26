// Person matte for a talking head, from Apple's Vision framework.
//
//   swiftc -O matte.swift -o matte
//   ./matte --quality accurate --out <dir> frame1.png frame2.png …
//   ./matte --quality accurate --out <dir> --list files.txt
//   ./matte --quality accurate --refine --out <dir> --list files.txt
//
// Why Vision and not a Python model: it ships with macOS, runs on the Neural
// Engine, needs no install and no download, and it is the same segmenter behind
// Portrait mode and Center Stage. RobustVideoMatting is better on hair but wants
// PyTorch (~2 GB) and has no temporal advantage on a locked-off tripod shot.
//
// Writes one 8-bit grayscale PNG per input, at the INPUT's pixel size. 255 = person,
// 0 = background. Without --refine: the raw mask, named <basename>.mask.png.
// With --refine: the mask build.sh composites, named m<the input's number>.png
// (f00042.jpg -> m00042.png), after the closing and the feather of matte.mjs, done
// here on the GPU (Core Image) instead of 19 ffmpeg passes on the CPU:
//   a closing (dilation x8 then erosion x8 of ffmpeg's 3x3 = a 17x17 square max then
//   min), a dilation x3 (7x7 max), a gaussian blur of sigma 1.8. Measured against the ffmpeg
//   chain on 300 frames: 99.99 % of the same person, 0.04/255 apart on average; and the
//   frame's edges are cleaner (ffmpeg's filters wrapped the left edge onto the right one).
// Several of these processes run side by side on interleaved lists (matte.mjs): one
// process leaves the Neural Engine idle while it decodes and encodes pictures.
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = Array(CommandLine.arguments.dropFirst())
func opt(_ k: String) -> String? { guard let i = args.firstIndex(of: k), i + 1 < args.count else { return nil }; return args[i + 1] }
let flags: Set<String> = ["--refine"]
let outDir = opt("--out") ?? "."
let qualityName = opt("--quality") ?? "accurate"
let refine = args.contains("--refine")
var inputs = args.enumerated().filter { i, a in
    !a.hasPrefix("--") && !(i > 0 && args[i - 1].hasPrefix("--") && !flags.contains(args[i - 1]))
}.map { $0.element }
if let listFile = opt("--list"), let text = try? String(contentsOfFile: listFile, encoding: .utf8) {
    inputs = text.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
}
guard !inputs.isEmpty else { FileHandle.standardError.write("no input image\n".data(using: .utf8)!); exit(1) }

let quality: VNGeneratePersonSegmentationRequest.QualityLevel = {
    switch qualityName {
    case "fast": return .fast
    case "balanced": return .balanced
    default: return .accurate
    }
}()

let ciContext = CIContext(options: [.useSoftwareRenderer: false])
// --refine: no colour management anywhere, a mask is numbers, not a picture
let maskContext = CIContext(options: [.useSoftwareRenderer: false, .workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
// One request object, reused: the model is loaded once instead of per frame.
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = quality
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let t0 = Date()
var done = 0
let gray = CGColorSpaceCreateDeviceGray()

func closingAndFeather(_ m: CIImage, _ extent: CGRect) -> CIImage {
    func rect(_ img: CIImage, _ size: Float, max: Bool) -> CIImage {
        if max {
            let f = CIFilter.morphologyRectangleMaximum(); f.inputImage = img; f.width = size; f.height = size; return f.outputImage!
        }
        let f = CIFilter.morphologyRectangleMinimum(); f.inputImage = img; f.width = size; f.height = size; return f.outputImage!
    }
    var x = m.clampedToExtent()          // the frame's edge repeated, as ffmpeg's filters do
    x = rect(x, 17, max: true)
    x = rect(x, 17, max: false)
    x = rect(x, 7, max: true)
    let g = CIFilter.gaussianBlur(); g.inputImage = x; g.radius = 1.6   // Core Image's radius 1.6 = ffmpeg's gblur sigma 1.8 (measured: 0.04/255 apart)
    return g.outputImage!.cropped(to: extent)
}

func writeGray(_ img: CIImage, _ extent: CGRect, to url: URL) -> Bool {
    let w = Int(extent.width), h = Int(extent.height)
    var buf = [UInt8](repeating: 0, count: w * h)
    maskContext.render(img, toBitmap: &buf, rowBytes: w, bounds: extent, format: .L8, colorSpace: nil)
    guard let provider = CGDataProvider(data: Data(buf) as CFData),
          let cg = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: w, space: gray,
                           bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue), provider: provider,
                           decode: nil, shouldInterpolate: false, intent: .defaultIntent),
          let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { return false }
    CGImageDestinationAddImage(dest, cg, nil)
    return CGImageDestinationFinalize(dest)
}

for path in inputs {
    let url = URL(fileURLWithPath: path)
    guard let src = CIImage(contentsOf: url) else {
        FileHandle.standardError.write("unreadable: \(path)\n".data(using: .utf8)!); continue
    }
    let handler = VNImageRequestHandler(ciImage: src, options: [:])
    do { try handler.perform([request]) } catch {
        FileHandle.standardError.write("Vision failed on \(path): \(error)\n".data(using: .utf8)!); continue
    }
    guard let mask = (request.results?.first)?.pixelBuffer else {
        FileHandle.standardError.write("no mask for \(path)\n".data(using: .utf8)!); continue
    }
    // The model returns its own resolution; scale it to the frame it came from.
    var maskImage = CIImage(cvPixelBuffer: mask)
    // Core Image reads the 8-bit mask as sRGB and the ffmpeg refinement this replaces got it
    // linearised (the soft edge thinner): the same curve here, or the edge moves by a pixel
    if refine { maskImage = maskImage.applyingFilter("CISRGBToneCurveToLinear") }
    let sx = src.extent.width / maskImage.extent.width
    let sy = src.extent.height / maskImage.extent.height
    maskImage = maskImage.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    let base = url.deletingPathExtension().lastPathComponent
    if refine {
        let n = base.drop(while: { !$0.isNumber })
        let outURL = URL(fileURLWithPath: outDir).appendingPathComponent("m\(n).png")
        guard writeGray(closingAndFeather(maskImage, src.extent), src.extent, to: outURL) else {
            FileHandle.standardError.write("could not write \(outURL.path)\n".data(using: .utf8)!); continue
        }
    } else {
        // OneComponent8 comes back as a single-channel image; write it as grayscale
        // RGB so ffmpeg reads it with no guessing.
        let rgb = maskImage.applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 1, y: 0, z: 0, w: 0),
            "inputBVector": CIVector(x: 1, y: 0, z: 0, w: 0),
            "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        // A colour matrix with a non-zero BIAS is defined everywhere, so the result
        // has an infinite extent and writePNGRepresentation refuses it ("image
        // extent must be finite and non-empty"). Crop AFTER the matrix, never before.
        ]).cropped(to: src.extent)
        let outURL = URL(fileURLWithPath: outDir).appendingPathComponent("\(base).mask.png")
        guard let cs = CGColorSpace(name: CGColorSpace.linearSRGB) else { exit(1) }
        do {
            try ciContext.writePNGRepresentation(of: rgb, to: outURL, format: .RGBA8, colorSpace: cs)
        } catch {
            FileHandle.standardError.write("could not write \(outURL.path): \(error)\n".data(using: .utf8)!); continue
        }
    }
    done += 1
    if done % 100 == 0 {
        let el = Date().timeIntervalSince(t0)
        FileHandle.standardError.write("  \(done)/\(inputs.count) — \(String(format: "%.0f", el))s, \(String(format: "%.1f", Double(done)/el)) img/s\n".data(using: .utf8)!)
    }
}
let el = Date().timeIntervalSince(t0)
print("\(done)/\(inputs.count) masks in \(String(format: "%.1f", el))s (\(String(format: "%.1f", Double(done)/max(el,0.001))) img/s, quality \(qualityName)\(refine ? ", refined" : ""))")
