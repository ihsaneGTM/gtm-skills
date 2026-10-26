// A sticker from a picture (Apple's Vision and Core Image, on this Mac): the subject cut out, a white
// outline that follows its silhouette, a soft warm shadow under it. The sticker recipe.
//
//   cutout <in> <out.png> [--mode vision|green|alpha] [--width 900] [--outline 13] [--no-shadow] [--preview <bg hex>]
//     vision  the subject Vision sees in the picture (macOS 14 and later)            ← default
//     green   a picture made on a flat chroma green (#00B140): the green touching the edges goes, green seen
//             through a window becomes tinted glass
//     alpha   the picture already has its transparency
//   --preview  also writes <out>-preview.jpg, the sticker on that colour, to look at
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let a = Array(CommandLine.arguments.dropFirst())
func opt(_ k: String) -> String? { guard let i = a.firstIndex(of: k), i + 1 < a.count else { return nil }; return a[i + 1] }
guard a.count >= 2 else { FileHandle.standardError.write("usage: cutout <in> <out.png> [--mode vision|green|alpha] [--width 900] [--outline 13] [--no-shadow] [--preview hex]\n".data(using: .utf8)!); exit(1) }
let inURL = URL(fileURLWithPath: a[0]), outURL = URL(fileURLWithPath: a[1])
let mode = opt("--mode") ?? "vision"
let W = Double(opt("--width") ?? "900") ?? 900
let OL = Double(opt("--outline") ?? "13") ?? 13
let shadow = !a.contains("--no-shadow")
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, .outputColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
func die(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }

guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { die("cannot read \(a[0])") }

// ── 1. the subject, with its transparency ───────────────────────────────────────────────────────
func rgba(_ img: CGImage) -> (UnsafeMutablePointer<UInt8>, Int, Int) {
  let w = img.width, h = img.height
  let buf = UnsafeMutablePointer<UInt8>.allocate(capacity: w * h * 4)
  let c = CGContext(data: buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  c.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  return (buf, w, h)
}
func image(_ buf: UnsafeMutablePointer<UInt8>, _ w: Int, _ h: Int) -> CGImage {
  let c = CGContext(data: buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  return c.makeImage()!
}

var subject: CIImage
switch mode {
case "alpha":
  subject = CIImage(cgImage: cg)
case "green":
  let (p, w, h) = rgba(cg)
  // green: the key colour family; flood from the edges, so only the background goes
  func green(_ i: Int) -> Bool { let r = Double(p[i]), g = Double(p[i + 1]), b = Double(p[i + 2]); return g > 70 && g > r * 1.22 && g > b * 1.15 }
  var bg = [Bool](repeating: false, count: w * h)
  var stack: [Int] = []
  for x in 0..<w { stack.append(x); stack.append((h - 1) * w + x) }
  for y in 0..<h { stack.append(y * w); stack.append(y * w + w - 1) }
  while let k = stack.popLast() {
    if bg[k] || !green(k * 4) { continue }
    bg[k] = true
    let x = k % w, y = k / w
    if x > 0 { stack.append(k - 1) }; if x < w - 1 { stack.append(k + 1) }
    if y > 0 { stack.append(k - w) }; if y < h - 1 { stack.append(k + w) }
  }
  for k in 0..<(w * h) {
    let i = k * 4
    if bg[k] { p[i] = 0; p[i + 1] = 0; p[i + 2] = 0; p[i + 3] = 0; continue }
    let r = Double(p[i]), g = Double(p[i + 1]), b = Double(p[i + 2])
    if green(i) {
      // green seen through a window: tinted glass
      let v = UInt8(max(18, min(70, (r + b) / 2 * 0.6)))
      p[i] = v; p[i + 1] = v; p[i + 2] = UInt8(min(255, Double(v) * 1.08)); p[i + 3] = 235
    } else if g > max(r, b) {
      p[i + 1] = UInt8(max(r, b))   // the green spill on the edges
    }
  }
  subject = CIImage(cgImage: image(p, w, h))
  p.deallocate()
default:
  if #available(macOS 14.0, *) {
    let req = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([req]) } catch { die("Vision: \(error)") }
    guard let res = req.results?.first else { die("Vision found no subject: try --mode green on a picture made on a flat green") }
    guard let px = try? res.generateMaskedImage(ofInstances: res.allInstances, from: handler, croppedToInstancesExtent: false) else { die("Vision could not cut the subject out") }
    subject = CIImage(cvPixelBuffer: px)
  } else { die("subject lifting needs macOS 14: use --mode green on a picture made on a flat green") }
}

// ── 2. cropped on the subject, at the sticker's width ───────────────────────────────────────────
let alphaGray = CIFilter.colorMatrix()
alphaGray.inputImage = subject
alphaGray.rVector = CIVector(x: 0, y: 0, z: 0, w: 1); alphaGray.gVector = CIVector(x: 0, y: 0, z: 0, w: 1); alphaGray.bVector = CIVector(x: 0, y: 0, z: 0, w: 1)
alphaGray.aVector = CIVector(x: 0, y: 0, z: 0, w: 0); alphaGray.biasVector = CIVector(x: 0, y: 0, z: 0, w: 1)
guard let maskCG = ctx.createCGImage(alphaGray.outputImage!, from: subject.extent) else { die("mask") }
let (mp, mw, mh) = rgba(maskCG)
var minX = mw, minY = mh, maxX = -1, maxY = -1
for y in 0..<mh { for x in 0..<mw where mp[(y * mw + x) * 4] > 8 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) } }
mp.deallocate()
guard maxX > minX, maxY > minY else { die("nothing left after the cut-out") }
// CGImage rows go down, Core Image's y goes up
let crop = CGRect(x: Double(minX), y: Double(mh - 1 - maxY), width: Double(maxX - minX + 1), height: Double(maxY - minY + 1))
let s = W / crop.width
var sub = subject.cropped(to: crop).transformed(by: CGAffineTransform(translationX: -crop.minX, y: -crop.minY))
let lz = CIFilter.lanczosScaleTransform(); lz.inputImage = sub; lz.scale = Float(s); lz.aspectRatio = 1
sub = lz.outputImage!
let size = CGSize(width: ceil(crop.width * s), height: ceil(crop.height * s))
let pad = 64.0 * W / 900.0, ol = OL * W / 900.0
let canvas = CGRect(x: 0, y: 0, width: size.width + 2 * pad, height: size.height + 2 * pad)
sub = sub.transformed(by: CGAffineTransform(translationX: pad, y: pad)).cropped(to: canvas)

// ── 3. the white outline and the shadow, from the subject's core ───────────────────────────────
func gray(_ img: CIImage) -> CIImage {
  let m = CIFilter.colorMatrix(); m.inputImage = img
  m.rVector = CIVector(x: 0, y: 0, z: 0, w: 1); m.gVector = CIVector(x: 0, y: 0, z: 0, w: 1); m.bVector = CIVector(x: 0, y: 0, z: 0, w: 1)
  m.aVector = CIVector(x: 0, y: 0, z: 0, w: 0); m.biasVector = CIVector(x: 0, y: 0, z: 0, w: 1)
  return m.outputImage!.cropped(to: canvas)
}
let black = CIImage(color: .black).cropped(to: canvas)
let core: CIImage = {
  let t = CIFilter.colorThreshold(); t.inputImage = gray(sub).composited(over: black); t.threshold = 0.47
  return t.outputImage!.cropped(to: canvas)
}()
func dilate(_ img: CIImage, _ r: Double) -> CIImage { let f = CIFilter.morphologyMaximum(); f.inputImage = img; f.radius = Float(r); return f.outputImage!.cropped(to: canvas) }
func blur(_ img: CIImage, _ r: Double) -> CIImage { img.clampedToExtent().applyingGaussianBlur(sigma: r).cropped(to: canvas) }
// the subject without the contact shadow its picture may carry
let keep = blur(dilate(core, 2 * W / 900), 1.2 * W / 900)
sub = sub.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: CIImage.empty().cropped(to: canvas), kCIInputMaskImageKey: keep])
let ring = blur(dilate(core, ol), 1.0)
func layer(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ mask: CIImage) -> CIImage {
  CIImage(color: CIColor(red: r, green: g, blue: b)).cropped(to: canvas)
    .applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: CIImage.empty().cropped(to: canvas), kCIInputMaskImageKey: mask])
}
var out = layer(1.0, 253 / 255, 248 / 255, ring)
if shadow {
  let soft = blur(ring, 16 * W / 900).applyingFilter("CIColorMatrix", parameters: ["inputRVector": CIVector(x: 0.5, y: 0, z: 0, w: 0), "inputGVector": CIVector(x: 0, y: 0.5, z: 0, w: 0), "inputBVector": CIVector(x: 0, y: 0, z: 0.5, w: 0), "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)])
    .transformed(by: CGAffineTransform(translationX: 0, y: -18 * W / 900)).cropped(to: canvas)
  out = out.composited(over: layer(20 / 255, 10 / 255, 6 / 255, soft.composited(over: black)))
}
out = sub.composited(over: out).cropped(to: canvas)

// ── 4. written ──────────────────────────────────────────────────────────────────────────────────
func write(_ img: CIImage, _ url: URL, _ type: UTType, _ q: Double = 1) {
  guard let cgOut = ctx.createCGImage(img, from: canvas), let dest = CGImageDestinationCreateWithURL(url as CFURL, type.identifier as CFString, 1, nil) else { die("cannot write \(url.path)") }
  CGImageDestinationAddImage(dest, cgOut, type == .jpeg ? [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary : nil)
  if !CGImageDestinationFinalize(dest) { die("cannot write \(url.path)") }
}
write(out, outURL, .png)
if let hex = opt("--preview"), let v = UInt32(hex.replacingOccurrences(of: "#", with: ""), radix: 16) {
  let bg = CIImage(color: CIColor(red: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255)).cropped(to: canvas)
  write(out.composited(over: bg), outURL.deletingPathExtension().appendingPathExtension("preview.jpg"), .jpeg, 0.9)
}
print("\(Int(canvas.width))x\(Int(canvas.height)) → \(outURL.path)")
