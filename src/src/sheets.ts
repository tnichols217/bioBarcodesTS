import * as spreadsheet from "google-spreadsheet"

export enum Sheets {
    Inventory = "Inventory",
    Categories = "Categories",
    History = "History",
    Lookup = "Lookup",
    ReverseLookup = "Reverse Lookup",
    UUIDs = "UUIDs",
    Variables = "Variables",
}

export class InventorySpreadsheet {
    public doc: spreadsheet.GoogleSpreadsheet
    private finishedInit: Promise<void>
    public constructor(email: string, key: string, ID: string) {
        this.doc = new spreadsheet.GoogleSpreadsheet(ID);
        this.finishedInit = new Promise<void>((resolve, reject) => {
            this.doc.useServiceAccountAuth({
                client_email: email,
                private_key: key,
              }).then(() => {
                  this.doc.loadInfo().then(resolve).catch(reject)
              })
        })
    }

    public getSheet<T extends Record<string, string> = Record<string, string>>(sheet: string, filter: (row: T) => boolean = () => true): Promise<T[]> {
        return new Promise<T[]> (async (resolve, reject) => {
            await this.finishedInit
            let spreadsheet = this.doc.sheetsByTitle[sheet];
            spreadsheet.getRows().then((rows) => {
                let out = rows.map(row => {
                    let newRow: Record<string, string> = {}
                    Object.entries(row).forEach(([key, val]) => {
                        if (!key.startsWith("_")) {
                            let name = key.split("").map((char): string => {
                                return char.match(/[a-zA-Z]/) ? char : ""
                            }).join("")
                            newRow[name] = val
                        }
                    })
                    return newRow as T
                }).filter(filter)
                resolve(out)
            })
        })
    }

    public async getDataStore(sheet: string) {
        await this.finishedInit
        return new SheetDataStore(this.doc.sheetsByTitle[sheet])
    }
}

export class SheetDataStore {
    public Sheet
    public constructor(sheet: spreadsheet.GoogleSpreadsheetWorksheet) {
        this.Sheet = sheet
    }

    public get(key: string) {
        return new Promise<string>(async (resolve, reject) => {
            let rows = (await this.Sheet.getRows()).map(row => row._rawData as string[])
            let keys = rows.map(row => row[0])
            let values = rows.map(row => row[1])
            let index = keys.indexOf(key)
            if (index != -1) {
                resolve(values[index])
            } else {
                reject("Not found")
            }
        })
    }

    public gets(keys: string[]) {
        return Promise.all(keys.map(key => this.get(key)))
    }

    public set(key: string, value: string) {
        return new Promise<void>(async (resolve, reject) => {
            let keys = (await this.Sheet.getRows()).map(row => row._rawData[0] as string)
            let index = keys.indexOf(key)
            if (index != -1) {
                await this.Sheet.loadCells()
                let updatedCell = this.Sheet.getCell(1, index + 1)
                updatedCell.value = value
                this.Sheet.saveCells([updatedCell])
                resolve()
            } else {
                this.Sheet.addRow([key, value])
                resolve()
            }
        })
    }

    public sets(keyVals: [string, string][]) {
        return Promise.all(keyVals.map(([key, val]) => this.set(key, val)))
    }

    public setDict(dict: Record<string, string>) {
        return this.sets(Object.entries(dict))
    }
}

module.exports = {
    Sheets,
    InventorySpreadsheet
}