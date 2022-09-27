
// import {v4 as UUID} from "uuid"
import JsBarcode from "jsbarcode"
import { DOMImplementation, XMLSerializer, DOMParser } from "xmldom"
import QRCode from "qrcode"
import { optimize, OptimizedSvg } from "svgo"
import { randomInt } from "crypto"

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const UUID_LENGTH = 11
const UUID = () => Array.from({length: UUID_LENGTH}, () => ALPHABET[randomInt(0, ALPHABET.length)]).join("")

export type ItemInfoType = {
    ID: string,
    Category: string,
    Name: string,
    Variation: string,
    Description: string
}

export class ItemInfo {
    public ItemInfo
    public constructor(ItemInfo: ItemInfoType) {
        this.ItemInfo = ItemInfo
    }
    public instantiate(): Item {
        return Item.generate(this.ItemInfo)
    }
}

export type ItemType = {
    ItemInfo: ItemInfoType,
    Barcode: string,
    QR: string,
    UUID: string,
}

export type QRData = {
    ID: string,
    Name: string,
    Category: string,
    Variation: string,
    UUID: string,
    Barcode: string
}

export class Item {
    public ItemInfo: ItemType

    public static generate(itemInfo: ItemInfoType): Item {

        let uuid = UUID()

        let Barcode = itemInfo.ID + "-" + uuid.slice(0, 3)

        return new Item({
            ItemInfo: itemInfo,

            Barcode: Barcode,

            QR: JSON.stringify({
                ID: itemInfo.ID,
                Name: itemInfo.Name,
                Category: itemInfo.Category,
                Variation: itemInfo.Variation,
                UUID: uuid
            } as QRData),

            UUID: uuid
        })
    }

    public constructor(itemInfo: ItemType) {
        this.ItemInfo = itemInfo
    }

    public async getBarcodeSVG(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const xmlSerializer = new XMLSerializer()
            const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null)
            const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

            JsBarcode(svgNode, this.ItemInfo.Barcode, {
                xmlDocument: document,
                format: "CODE39",
                displayValue: false,
                height: 50,
                width: 1,
                margin: 10,
                flat: true,
                textMargin: 0
            });

            const result = optimize(xmlSerializer.serializeToString(svgNode), {
                multipass: true,
            });

            if (!Object.keys(result).includes("data")) {
                reject("cant optimize data")
            }

            resolve((result as OptimizedSvg).data)
        })
    }

    public async getQRSVG(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            QRCode.toString(this.ItemInfo.QR, {
                errorCorrectionLevel: 'H',
                type: "svg",
                width: 115,
                margin: 10,
                scale: 1
            }).then(qrstring => {
                const result = optimize(qrstring, {
                    multipass: true,
                });
    
                if (!Object.keys(result).includes("data")) {
                    reject("cant optimize data")
                }
    
                resolve((result as OptimizedSvg).data)
            })
        })
    }

    public async getBarcodeWords(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            let out = []
            const chunkSize = 11
            // list of elements that will be on the barcode, in order
            const words = [
                this.ItemInfo.ItemInfo.Name, 
                this.ItemInfo.ItemInfo.Category, 
                this.ItemInfo.ItemInfo.Variation, 
                this.ItemInfo.Barcode,
                this.ItemInfo.UUID
            ]
            // the amount of lines each element will take up
            const lines = [
                3,
                2,
                1,
                1,
                1
            ]
            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < lines[i]; j++) {
                    out.push(
                        words[i].slice(j * chunkSize, (j + 1) * chunkSize)
                    )
                }
            }
            resolve(out)
        })
    }

    public async getFullSVG(): Promise<string> {
        const xmlSerializer = new XMLSerializer()
        const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null)
        const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

        const textSize = 20
        const QRSize = 115
        const BarcodeHeight = 70
        const textWidth = 160
        const textMarginUp = 30
        const textMarginLeft = 15

        svgNode.setAttribute('width', `${textWidth + QRSize}`)
        svgNode.setAttribute('height', `${BarcodeHeight + QRSize}`)

        let g = svgNode.appendChild(document.createElement('g'))
        g.setAttribute('transform', `translate(${textWidth},0)`)
        const DOMparse = new DOMParser()
        let parsedQR = DOMparse.parseFromString(await this.getQRSVG())
        g.appendChild(parsedQR)

        let gg = g.appendChild(document.createElement('g'))
        gg.setAttribute('transform', `translate(0,${QRSize})`)
        let parsedBar = DOMparse.parseFromString(await this.getBarcodeSVG())
        gg.appendChild(parsedBar)

        let textGroup = svgNode.appendChild(document.createElement('g'))
        textGroup.setAttribute('transform', `translate(${textMarginLeft}, ${textMarginUp})`)
        let text = textGroup.appendChild(document.createElement('text'))
        text.setAttribute("font-size", textSize.toString())
        text.setAttribute("font-family", "Hack-Regular")

        let curHeight = 0
        for (const line of await this.getBarcodeWords()) {
            let lineElement = text.appendChild(document.createElement('tspan'))
            lineElement.setAttribute('x', "0")
            lineElement.setAttribute('y', `${curHeight * textSize}`)
            lineElement.textContent = line
            lineElement.innerText = line
            curHeight++
        }
        return xmlSerializer.serializeToString(svgNode);
    }
}

module.exports = {
    ItemInfo,
    Item
}