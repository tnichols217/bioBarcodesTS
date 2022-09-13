import * as csv from "./csv"
import * as invs from "./inventory"
import * as process from "process"
import * as pdf from "./pdf"
import * as fs from "fs"

const args = process.argv.slice(2)
const [invCsv, histCsv, outFile] = args

let invCSV = new csv.CSVFileParse<invs.InventoryItemType>(invCsv)
let histCSV = new csv.CSVFileParse<invs.HistoryItemInputType>(histCsv)

Promise.all([invCSV.complete, histCSV.complete]).then(([inv, hist]) => {
    let inventory = invs.Inventory.constructFromCSV(inv)
    let history = invs.History.constructFromCSV(hist, "0")

    let UUIDdict = history.instantiate(inventory)
    let instances = inventory.getAllInstances()

    Promise.all(Object.values(instances).map((instance) => instance.getFullSVG())).then((svgs) => {
        let pdfs = new pdf.SVG2PDF(40, 4, 10)
        let file = fs.createWriteStream(outFile)
        pdfs.convertToPDF(svgs, file, {
            "Hack-Regular" : "Hack-Regular.ttf"
            }
        )
    })

    console.log(UUIDdict)
})
