import * as csv from "./csv"
import * as invs from "./inventory"
import * as process from "process"
import * as pdf from "./pdf"
import * as fs from "fs"
import * as de from "dotenv"
import * as sheets from "./sheets"

const conf = process.argv[2]

de.config(conf ? { path: conf } : {})
type EnvOverlap = {
    OUTPUT_FOLDER: string,
    USE: USE,
    MODE: MODE,
    INVENTORY_CSV: string,
    HISTORY_CSV: string,
    LAST_TRSX: string,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: string,
    GOOGLE_PRIVATE_KEY: string,
    SPREADSHEET_ID: string
}
type EnvInput = EnvOverlap & {
    INTERVAL: string
}
type Env = EnvOverlap & {
    INTERVAL: number
}
enum USE {
    CSV = "csv",
    SHEETS = "sheets"
}
enum MODE {
    ONESHOT = "oneshot",
    DAEMON = "daemon"
}

const parseEnv = (env: NodeJS.ProcessEnv) => {
    let castedEnv = env as EnvInput
    return Object.assign(castedEnv, {
        INTERVAL: castedEnv ? parseInt(castedEnv.INTERVAL) : 60000
    }) as Env
}

let env = parseEnv(process.env)

let sheet: sheets.InventorySpreadsheet, inventoryData: Promise<invs.InventoryItemType[]>, historyData: Promise<invs.HistoryItemInputType[]>

const main = async () => {
    if (env.USE = USE.SHEETS) {
        // use sheets
        sheet = new sheets.InventorySpreadsheet(env.GOOGLE_SERVICE_ACCOUNT_EMAIL, env.GOOGLE_PRIVATE_KEY, env.SPREADSHEET_ID)
        inventoryData = sheet.getSheet<invs.InventoryItemType>(sheets.Sheets.Inventory, (row) => !!row.Name)
        historyData = sheet.getSheet<invs.HistoryItemInputType>(sheets.Sheets.History, (row) => !!row.ChangeInQuantity)
    } else {
        // use csv
        inventoryData = new csv.CSVFileParse<invs.InventoryItemType>(env.INVENTORY_CSV).complete
        historyData = new csv.CSVFileParse<invs.HistoryItemInputType>(env.HISTORY_CSV).complete
    }


    Promise.all([inventoryData, historyData]).then(async ([inv, hist]) => {

        let lastTrsx: string

        if (env.USE = USE.SHEETS) {
            // use sheets
            lastTrsx = await (await sheet.getDataStore(sheets.Sheets.Variables)).get("LargestTrsx").catch(console.error) || "0"
        } else {
            // use csv
            lastTrsx = env.LAST_TRSX || "0"
        }

        let inventory = invs.Inventory.constructFromCSV(inv)
        let history = invs.History.constructFromCSV(hist, lastTrsx)

        let UUIDdict = history.instantiate(inventory)

        if (lastTrsx != history.LargestTrsx) {
            let instances = inventory.getAllInstances()
            console.log(instances)
            Promise.all(Object.values(instances).map((instance) => instance.getFullSVG())).then((svgs) => {
                let pdfs = new pdf.SVG2PDF(40, 4, 10)
                let outFile = `${env.OUTPUT_FOLDER}/${lastTrsx}-${history.LargestTrsx}.pdf`
                let file = fs.createWriteStream(outFile)
                pdfs.convertToPDF(svgs, file, {
                    "Hack-Regular": "Hack-Regular.ttf"
                })
            })
        }

        if (env.USE = USE.SHEETS) {
            // use sheets
            sheet.getDataStore(sheets.Sheets.UUIDs).then((dataStore) => {
                dataStore.setDict(UUIDdict)
            })

            sheet.getDataStore(sheets.Sheets.Variables).then((dataStore) => {
                dataStore.set("LargestTrsx", history.LargestTrsx)
            })

            sheet.updateLocations()
        } else {
            // use csv
            console.log(UUIDdict)
            console.log(history.LargestTrsx)
        }
    })
}

if (env.MODE == MODE.DAEMON) {
    const wrappedMain = async () => {
        console.log("Running main now...")
        main()
        console.log(`Watiting for ${env.INTERVAL}ms...`)
        setTimeout(wrappedMain, env.INTERVAL)
    }
    wrappedMain()
} else {
    main()
}