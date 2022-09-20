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
    Time = 0,
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
        let LocationsDict: Record<string, {location: string, date: string}> = {}
        this.doc.sheetsByTitle[Sheets.Locations].getRows().then(rows => {
            rows.forEach(row => {
                let data = row._rawData as string[]
                LocationsDict[data[Locations.UUID]] = {location: data[Locations.Location], date: data[Locations.Time]}
            })
            Object.entries(LocationsDict).forEach(async ([uuid, info]) => {
                if (uuid.length < 15) {
                    uuid = await this.barcodeToUUID(uuid.slice(0, 11))
                    this.getDataStore(Sheets.Locations).then(dataStore => dataStore.set(info.date, uuid))
                } else if (uuid.length > 40) {
                    uuid = (JSON.parse(uuid) as QRData).UUID
                }
                UUIDsSheet.set(uuid, info.location, UUIDs.Location)
            })
        })
    }
}

export class SheetDataStore {
    public Sheet
    public constructor(sheet: spreadsheet.GoogleSpreadsheetWorksheet) {
        this.Sheet = sheet
    }

    public get(key: string, column: number = 1, searchColumn: number = 0) {
        return new Promise<string>(async (resolve, reject) => {
            let rows = (await this.Sheet.getRows()).map(row => row._rawData as string[])
            let keys = rows.map(row => row[searchColumn])
            let values = rows.map(row => row[column])
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

    public set(key: string, value: string, column: number = 1) {
        return new Promise<void>(async (resolve, reject) => {
            let keys = await this.Sheet.getRows().then(rows => rows.map(row => row._rawData[0] as string)).catch(reject) as string[]
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

    public setRow(key: string, values: string[]) {
        return new Promise<void>(async (resolve, reject) => {
            let keys = await this.Sheet.getRows().then(rows => rows.map(row => row._rawData[0] as string)).catch(reject) as string[]
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

    public sets(keyVals: [string, string][]) {
        return Promise.all(keyVals.map(([key, val]) => this.set(key, val)))
    }

    public setsRow(keyVals: [string, string[]][]) {
        return Promise.all(keyVals.map(([key, values]) => this.setRow(key, values)))
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