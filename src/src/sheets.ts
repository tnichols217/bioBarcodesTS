import * as spreadsheet from "google-spreadsheet"
import { UrlWithStringQuery } from "url";
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
    TrsxID = 0,
    Time,
    UUID,
    Location
}

export enum UUIDs {
    UUID = 0,
    ID,
    Barcode,
    Location
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
                let data = row._rawData as string[]
                LocationsDict[data[Locations.UUID]] = {location: data[Locations.Location], ID: data[Locations.TrsxID]}
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

    public get(key: string, column: number = 1, searchColumn: number = 0, transform: (key: string) => string = key => key) {
        return new Promise<string>(async (resolve, reject) => {
            let rows = (await this.Sheet.getRows()).map(row => row._rawData as string[])
            let keys = rows.map(row => row[searchColumn]).map(transform)
            let values = rows.map(row => row[column])
            let index = keys.indexOf(key)
            if (index != -1) {
                resolve(values[index])
            } else {
                reject("Not found")
            }
        })
    }

    public gets(keys: string[], column: number = 1, searchColumn: number = 0, transform: (key: string) => string = key => key) {
        return Promise.all(keys.map(key => this.get(key, column, searchColumn, transform)))
    }

    public set(key: string, value: string, column: number = 1, searchColumn: number = 0) {
        return new Promise<void>(async (resolve, reject) => {
            let keys = await this.Sheet.getRows().then(rows => rows.map(row => row._rawData[searchColumn] as string)).catch(reject) as string[]
            let index = keys.indexOf(key)
            if (index != -1) {
                await this.Sheet.loadCells().catch(reject)
                let updatedCell = this.Sheet.getCell(index + 1, column)
                updatedCell.value = value
                updatedCell.save()
                resolve()
            } else {
                this.Sheet.addRow([key, value])
                resolve()
            }
        })
    }

    public setRow(key: string, values: string[], searchColumn: number = 0) {
        return new Promise<void>(async (resolve, reject) => {
            let keys = await this.Sheet.getRows().then(rows => rows.map(row => row._rawData[searchColumn] as string)).catch(reject) as string[]
            let index = keys.indexOf(key)
            if (index != -1) {
                await this.Sheet.loadCells().catch(reject)
                for (let i = 0; i < values.length; i++) {
                    let updatedCell = this.Sheet.getCell(index + 1, i)
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

    public sets(keyVals: [string, string][], column: number = 1, searchColumn: number = 0) {
        return Promise.all(keyVals.map(([key, val]) => this.set(key, val, column, searchColumn)))
    }

    public setsRow(keyVals: [string, string[]][], searchColumn: number = 0) {
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