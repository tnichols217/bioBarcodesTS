import * as pdfkit from "pdfkit"
import * as svg2pdf from "svg-to-pdfkit"
import { DOMImplementation, XMLSerializer, DOMParser } from "xmldom"
import * as Stream from "stream"

export class SVG2PDF {
    public scale: number
    public horiCount: number
    public vertCount: number
    private static oriTagWidth = 275
    private static oriTagHeight = 185
    private static a4width = 210
    private static a4height = 297
    private static pageScale = 3.7795275590551185 // (pixels per milimeter at 96 dpi)
    public yOffset: number
    public xOffset: number

    public constructor(tagWidth: number, horiCount: number, vertCount: number) {
        this.scale = tagWidth / SVG2PDF.oriTagWidth
        this.horiCount = horiCount
        this.vertCount = vertCount
        this.yOffset = (SVG2PDF.a4height - this.scale * SVG2PDF.oriTagHeight * this.vertCount) / 2
        this.xOffset = (SVG2PDF.a4width - tagWidth * this.horiCount) / 2
    }

    private split<T>(svgs: T[]): T[][][] {
        let out = []
        for (let i = 0; i < svgs.length; i++) {
            if (i % (this.horiCount * this.vertCount) == 0) {
                out.push([[svgs[i]]])
            } else if (i % this.horiCount == 0) {
                out[out.length - 1].push([svgs[i]])
            } else {
                let inx = out.length - 1
                out[inx][out[inx].length - 1].push(svgs[i])
            }
        }
        return out
    }

    public createPageSVG(svgs: string[][]):string {
        const xmlSerializer = new XMLSerializer()
        const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null)
        const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svgNode.setAttribute('width', `${SVG2PDF.a4width * SVG2PDF.pageScale}`)
        svgNode.setAttribute('height', `${SVG2PDF.a4height * SVG2PDF.pageScale}`)
        let pageSVGG = svgNode.appendChild(document.createElement('g'))
        pageSVGG.setAttribute('transform', `translate(${this.xOffset * SVG2PDF.pageScale} ${this.yOffset * SVG2PDF.pageScale}) scale(${this.scale * SVG2PDF.pageScale})`)
        for (let row = 0; row < svgs.length; row++) {
            let rowG = pageSVGG.appendChild(document.createElement('g'))
            rowG.setAttribute('transform', `translate(0 ${SVG2PDF.oriTagHeight * row})`)
            for (let col = 0; col < svgs[row].length; col++) {
                let itemG = rowG.appendChild(document.createElement('g'))
                itemG.setAttribute('transform', `translate(${SVG2PDF.oriTagWidth * col} 0)`)
                const domparse = new DOMParser()
                itemG.appendChild(domparse.parseFromString(svgs[row][col]))
            }
        }

        return xmlSerializer.serializeToString(svgNode)
    }

    public convertToPDF(svgs: string[], writeStream: Stream.Writable, fonts: Record<string, string> = {}) {
        let split = this.split(svgs)
        const doc = new pdfkit.default({size: "A4"})
        doc.pipe(writeStream);
        for (let [name, font] of Object.entries(fonts)) {
            doc.registerFont(name)
            doc.font(font)
        }
        let pageSVGs = split.map(page => this.createPageSVG(page)).forEach((page, index) => {
            if (index != 0) {
                doc.addPage()
            }
            svg2pdf.default(doc, page, 0, 0)
        })
        doc.save()
        doc.end()
    }
}

module.exports = {
    SVG2PDF
}