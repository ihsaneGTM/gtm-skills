// The text of a picture, with its boxes in pixels (Apple's Vision, on this Mac): a real document is
// annotated where a word is, the moment the voice says it.
//   ocr <image> [--lang fr-FR,en-US]   → JSON on stdout: { "w", "h", "lines": [{ "t", "x", "y", "w", "h" }] }
import Foundation
import Vision
import AppKit

let a = CommandLine.arguments
guard a.count >= 2, let img = NSImage(contentsOfFile: a[1]), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write("usage: ocr <image> [--lang fr-FR,en-US]\n".data(using: .utf8)!); exit(1)
}
var langs = ["en-US", "fr-FR"]
if let i = a.firstIndex(of: "--lang"), i + 1 < a.count { langs = a[i + 1].split(separator: ",").map(String.init) }
let W = Double(cg.width), H = Double(cg.height)
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.recognitionLanguages = langs
req.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
var out: [[String: Any]] = []
for o in req.results ?? [] {
  guard let c = o.topCandidates(1).first else { continue }
  let b = o.boundingBox
  out.append(["t": c.string, "x": Int(b.minX * W), "y": Int((1 - b.maxY) * H), "w": Int(b.width * W), "h": Int(b.height * H)])
}
let d = try JSONSerialization.data(withJSONObject: ["w": Int(W), "h": Int(H), "lines": out], options: [.prettyPrinted])
print(String(data: d, encoding: .utf8)!)
