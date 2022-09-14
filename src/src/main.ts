import * as csv from "./csv"
import * as invs from "./inventory"
import * as process from "process"
import * as pdf from "./pdf"
import * as fs from "fs"
import * as de from "dotenv"
import * as sheets from "./sheets"

const args = process.argv.slice(2)
const [outFolder, invCsv, histCsv] = args

// use google sheets to get info
de.config()
type Env = {
    OUTPUT_FOLDER: string,
    USE: string,
    INVENTORY_CSV: string,
    HISTORY_CSV: string,
    LAST_TRSX: string,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: string,
    GOOGLE_PRIVATE_KEY: string,
    SPREADSHEET_ID: string,
}
enum USE {
    CSV = "csv",
    SHEETS = "sheets"
}
let env = process.env as Env

let sheet: sheets.InventorySpreadsheet, inventoryData: Promise<invs.InventoryItemType[]>, historyData: Promise<invs.HistoryItemInputType[]>

if (env.USE = USE.SHEETS) {
    // use sheets
    sheet = new sheets.InventorySpreadsheet(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY, env.SPREADSHEET_ID)
    inventoryData = sheet.getSheet<invs.InventoryItemType>(sheets.Sheets.Inventory, (row) => !!row.Name)
    historyData = sheet.getSheet<invs.HistoryItemInputType>(sheets.Sheets.History, (row) => !!row.ChangeInQuantity)
} else {
    // use csv
    inventoryData = new csv.CSVFileParse<invs.InventoryItemType>(invCsv).complete
    historyData = new csv.CSVFileParse<invs.HistoryItemInputType>(histCsv).complete
}


Promise.all([inventoryData, historyData]).then(async ([inv, hist]) => {

    let lastTrsx: string

    if (env.USE = USE.SHEETS) {
        // use sheets
        lastTrsx = await (await sheet.getDataStore(sheets.Sheets.Variables)).get("LargestTrsx")

    } else {
        // use csv
       lastTrsx = env.LAST_TRSX
    }

    let inventory = invs.Inventory.constructFromCSV(inv) 
    let history = invs.History.constructFromCSV(hist, lastTrsx)

    let UUIDdict = history.instantiate(inventory)
    let instances = inventory.getAllInstances()

    Promise.all(Object.values(instances).map((instance) => instance.getFullSVG())).then((svgs) => {
        let pdfs = new pdf.SVG2PDF(40, 4, 10)
        let outFile = `${outFolder}/${lastTrsx}-${history.LargestTrsx}.pdf`
        let file = fs.createWriteStream(outFile)
        pdfs.convertToPDF(svgs, file, {
            "Hack-Regular" : "Hack-Regular.ttf"
        })
    })

    if (env.USE = USE.SHEETS) {
        // use sheets
        sheet.getDataStore(sheets.Sheets.UUIDs).then((dataStore) => {
            dataStore.setDict(UUIDdict)
        })

        sheet.getDataStore(sheets.Sheets.Variables).then((dataStore) => {
            dataStore.set("LargestTrsx", history.LargestTrsx)
        })
    } else {
        // use csv
        console.log(UUIDdict)
        console.log(history.LargestTrsx)
    }
})
