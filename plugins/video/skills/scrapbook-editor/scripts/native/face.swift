// Where the face is, from Apple's Vision framework (the same one the engine's matte uses).
//
//   swiftc -O face.swift -o face
//   ./face --list files.txt          # one JSON line per image: {"f":…,"x":…,"y":…,"w":…,"h":…}
//
// x, y, w, h: the largest face's box, as fractions of the image, origin at the TOP-left (Vision
// counts from the bottom; this flips it). An image with no face prints {"f":…,"none":true}.
import Foundation
import Vision
import CoreImage

let args = Array(CommandLine.arguments.dropFirst())
func opt(_ k: String) -> String? { guard let i = args.firstIndex(of: k), i + 1 < args.count else { return nil }; return args[i + 1] }
var inputs: [String] = []
if let listFile = opt("--list"), let text = try? String(contentsOfFile: listFile, encoding: .utf8) {
    inputs = text.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
}
guard !inputs.isEmpty else { FileHandle.standardError.write("no input image (--list files.txt)\n".data(using: .utf8)!); exit(1) }

let request = VNDetectFaceRectanglesRequest()
for path in inputs {
    let url = URL(fileURLWithPath: path)
    guard let src = CIImage(contentsOf: url) else { print("{\"f\":\"\(path)\",\"none\":true}"); continue }
    let handler = VNImageRequestHandler(ciImage: src, options: [:])
    do { try handler.perform([request]) } catch { print("{\"f\":\"\(path)\",\"none\":true}"); continue }
    let faces = (request.results ?? []).sorted { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }
    guard let b = faces.first?.boundingBox else { print("{\"f\":\"\(path)\",\"none\":true}"); continue }
    let x = b.origin.x, y = 1 - b.origin.y - b.height
    print(String(format: "{\"f\":\"%@\",\"x\":%.4f,\"y\":%.4f,\"w\":%.4f,\"h\":%.4f}", path, x, y, b.width, b.height))
}
