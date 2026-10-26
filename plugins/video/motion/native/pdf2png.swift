// One page of a PDF as a PNG on white (PDFKit, on this Mac): an official form, a report, a notice.
//   pdf2png <file.pdf> count                    → the number of pages
//   pdf2png <file.pdf> <page, 1 = first> <dpi> <out.png>
import Foundation
import PDFKit
import AppKit

let a = CommandLine.arguments
guard a.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else {
  FileHandle.standardError.write("usage: pdf2png <file.pdf> <page|count> [dpi] [out.png]\n".data(using: .utf8)!); exit(1)
}
if a[2] == "count" { print(doc.pageCount); exit(0) }
guard a.count >= 5, let n = Int(a[2]), let page = doc.page(at: n - 1), let dpi = Double(a[3]) else {
  FileHandle.standardError.write("bad page or dpi\n".data(using: .utf8)!); exit(1)
}
let box = page.bounds(for: .mediaBox)
let s = dpi / 72.0
let w = Int(box.width * s), h = Int(box.height * s)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cg = ctx.cgContext
cg.setFillColor(NSColor.white.cgColor)
cg.fill(CGRect(x: 0, y: 0, width: w, height: h))
cg.scaleBy(x: CGFloat(s), y: CGFloat(s))
cg.translateBy(x: -box.origin.x, y: -box.origin.y)
page.draw(with: .mediaBox, to: cg)
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[4]))
print("\(w)x\(h) → \(a[4])")
