import * as spreadsheet from "google-spreadsheet"
import { QRData } from "./barcode"

export enum Sheets {
    Inventory = "Inventory",
    Categories = "Categories",
    History = "History",
    Lookup = "Lookup",
    ReverseLookup = "Reverse Lookup",
    UUIDs = "UUIDs",
    Variables = "Variables",
    Locations = "Locations"
}

export enum Locations {
    TrsxID = "Trsx ID",
    Time = "Time",
    UUID = "UUID",
    Location = "Location"
}

export enum UUIDs {
    UUID = "UUID",
    ID = "ID",
    Barcode = "Barcode",
    Location = "Location"
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

    public async setLocation(UUID: string, Location: string) {
        await this.finishedInit
        let LocationsSheet = await this.getDataStore(Sheets.Locations)
        let UUIDsSheet = await this.getDataStore(Sheets.UUIDs)
        LocationsSheet.setRow(Date.now().toString(), [UUID, Location])
        UUIDsSheet.set(UUID, Location, UUIDs.Location)
    }

    public async barcodeToUUID(barcode: string): Promise<string> {
        await this.finishedInit
        let UUIDsSheet = await this.getDataStore(Sheets.UUIDs)
        return UUIDsSheet.get(barcode, UUIDs.UUID, UUIDs.Barcode)
    }

    public async updateLocations() {
        let UUIDsSheet = await this.getDataStore(Sheets.UUIDs)
        let LocationsDict: Record<string, {location: string, ID: string}> = {}
        this.doc.sheetsByTitle[Sheets.Locations].getRows().then(rows => {
            rows.forEach(row => {
                LocationsDict[row[Locations.UUID]] = {location: row[Locations.Location], ID: row[Locations.TrsxID]}
            })
            Object.entries(LocationsDict).forEach(async ([uuid, info]) => {
                if (uuid.startsWith("{")) { //is JSON because of the QR
                    uuid = (JSON.parse(uuid) as QRData).UUID
                }

                uuid = uuid.toUpperCase()

                UUIDsSheet.get(uuid).then(() => {                                                                           //uuid exists
                    UUIDsSheet.set(uuid, info.location, UUIDs.Location)
                }).catch(() => {                                                                                            //uuid doesnt exist
                    this.barcodeToUUID(uuid).then(uuid => {                                                                     //barcode exists
                        this.getDataStore(Sheets.Locations).then(dataStore => dataStore.set(info.ID, uuid, Locations.UUID))
                        UUIDsSheet.set(uuid, info.location, UUIDs.Location)
                    }).catch(() => {                                                                                            //barcode doesnt exist
                        UUIDsSheet.get(uuid, UUIDs.UUID, UUIDs.UUID, key => key.slice(0, uuid.length)).then(uuid => {               //shortcode exists
                            this.getDataStore(Sheets.Locations).then(dataStore => dataStore.set(info.ID, uuid, Locations.UUID))
                            UUIDsSheet.set(uuid, info.location, UUIDs.Location)
                        }).catch(() => {                                                                                            //shortcode doesnt exist
                            console.error("cannot find barcode ", uuid)
                        })
                    })
                })
            })
        })
    }
}

export class SheetDataStore {
    public Sheet
    public constructor(sheet: spreadsheet.GoogleSpreadsheetWorksheet) {
        this.Sheet = sheet
    }

    public get(key: string, column: string = "", searchColumn: string = "", transform: (key: string) => string = key => key) {
        return new Promise<string>(async (resolve, reject) => {
            let rows = await this.Sheet.getRows()
            let keys = rows.map(row => searchColumn ? row[searchColumn] : row._rawData[0]).map(transform)
            let values = rows.map(row => column ? row[column] : row._rawData[1])
            let index = keys.indexOf(key)
            if (index != -1) {
                resolve(values[index])
            } else {
                reject("Not found")
            }
        })
    }

    public gets(keys: string[], column: string = "", searchColumn: string = "", transform: (key: string) => string = key => key) {
        return Promise.all(keys.map(key => this.get(key, column, searchColumn, transform)))
    }

    public set(key: string, value: string, column: string = "", searchColumn: string = "") {
        return new Promise<void>(async (resolve, reject) => {
            let rows = await this.Sheet.getRows().catch(reject) as spreadsheet.GoogleSpreadsheetRow[]
            let keys = rows.map(row => searchColumn ? row[searchColumn] as string : row._rawData[0] as string)
            let index = keys.indexOf(key)
            if (index != -1) {
                await this.Sheet.loadCells().catch(reject)
                let updatedCell = this.Sheet.getCell(rows[index].rowIndex - 1, column ? this.Sheet.headerValues.indexOf(column) : 1)
                updatedCell.value = value
                updatedCell.save()
                resolve()
            } else {
                this.Sheet.addRow([key, value])
                resolve()
            }
        })
    }

    public setRow(key: string, values: string[], searchColumn: string = "") {
        return new Promise<void>(async (resolve, reject) => {
            let rows = await this.Sheet.getRows().catch(reject) as spreadsheet.GoogleSpreadsheetRow[]
            let keys = rows.map(row => searchColumn ? row[searchColumn] as string : row._rawData[0] as string)
            let index = keys.indexOf(key)
            if (index != -1) {
                await this.Sheet.loadCells().catch(reject)
                for (let i = 0; i < values.length; i++) {
                    let updatedCell = this.Sheet.getCell(rows[index].rowIndex, i)
                    updatedCell.value = values[i]
                    updatedCell.save()
                }
                resolve()
            } else {
                this.Sheet.addRow([key, ...values])
                resolve()
            }
        })
    }

    public sets(keyVals: [string, string][], column: string = "", searchColumn: string = "") {
        return Promise.all(keyVals.map(([key, val]) => this.set(key, val, column, searchColumn)))
    }

    public setsRow(keyVals: [string, string[]][], searchColumn: string = "") {
        return Promise.all(keyVals.map(([key, values]) => this.setRow(key, values, searchColumn)))
    }

    public setDict(dict: Record<string, string[]>) {
        return this.setsRow(Object.entries(dict))
    }
}

module.exports = {
    Sheets,
    InventorySpreadsheet,
    Locations
}