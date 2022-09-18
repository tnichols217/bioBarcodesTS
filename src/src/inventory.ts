import * as barcode from "./barcode"

export type InventoryItemType = {
    ID: string,
    CategoryID: string,
    ItemID: string,
    VariationID: string,
    Category: string,
    Name: string,
    Variation: string,
    Description: string,
    Quantity: string
}

export type HistoryItemInputType = {
    TrsxID: string,
    Date: string,
    ID: string,
    Name: string,
    ChangeInQuantity: string,
    ReasonNotes: string
}

export type HistoryItemType = {
    TrsxID: string,
    Date: string,
    ID: string,
    Name: string,
    ChangeInQuantity: number,
    ReasonNotes: string
}

export class InventoryItem {
    public InventoryItem: InventoryItemType
    public Instances: Record<string, barcode.Item>
    public BarcodeItem: barcode.ItemInfo

    public constructor(data: InventoryItemType) {
        this.InventoryItem = data
        this.Instances = {}
        this.BarcodeItem = new barcode.ItemInfo(this.InventoryItem as barcode.ItemInfoType)
    }

    public instantiate(n: number = 1): Record<string, string[]> {
        let out: Record<string, string[]> = {}
        for (let i = 0; i < n; i++) {
            let instance = this.BarcodeItem.instantiate()
            this.Instances[instance.ItemInfo.UUID] = instance
            out[instance.ItemInfo.UUID] = [instance.ItemInfo.ItemInfo.ID, instance.ItemInfo.Barcode]
        }
        return out
    }
}

export class Inventory {
    public Items: Record<string, InventoryItem>
    
    public constructor(data: InventoryItem[]) {
        this.Items = {}
        data.forEach((item: InventoryItem) => {
            this.Items[item.InventoryItem.ID] = item
        })
    }

    public static constructFromCSV(parsedCSV: InventoryItemType[]): Inventory {
        return new Inventory(parsedCSV.map(item => new InventoryItem(item)))
    }

    public getAllInstances(): Record<string, barcode.Item> {
        return Object.assign({}, ...Object.values(this.Items).map(item => item.Instances))
    }
}

export class HistoryItem {
    public HistoryItem: HistoryItemType

    public constructor(data: HistoryItemInputType) {
        this.HistoryItem = Object.assign({}, data, {ChangeInQuantity: parseInt(data.ChangeInQuantity)})
    }

    public instantiate(inv: Inventory): Record<string, string[]> {
        return inv.Items[this.HistoryItem.ID].instantiate(this.HistoryItem.ChangeInQuantity)
    }
}

export class History {
    public Items: Record<string, HistoryItem>
    public LargestTrsx: string
    
    public constructor(data: HistoryItem[], trsx?: string) {
        let largestNum = 0
        this.LargestTrsx = "0"
        let trsxNum: number = 0
        if (trsx) {
            trsxNum = parseInt(trsx, 16)
            this.LargestTrsx = trsx
            largestNum = trsxNum
        }
        this.Items = {}
        data.forEach((item: HistoryItem) => {
            let curTrsxNum = parseInt(item.HistoryItem.TrsxID, 16)
            if (!trsx || curTrsxNum > trsxNum) {
                this.Items[item.HistoryItem.TrsxID] = item
                if (curTrsxNum > largestNum) {
                    largestNum = curTrsxNum
                    this.LargestTrsx = item.HistoryItem.TrsxID
                }
            }
        })
    }

    public static constructFromCSV(parsedCSV: HistoryItemInputType[], trsx?: string): History {
        return new History(parsedCSV.map(item => new HistoryItem(item)), trsx)
    }

    public filter(trsx: string) {
        let trsxNum = parseInt(trsx, 16)
        let out: Record<string, HistoryItem> = {}
        Object.values(this.Items).forEach((item: HistoryItem) => {
            if (parseInt(item.HistoryItem.TrsxID, 16) > trsxNum) {
                out[item.HistoryItem.TrsxID] = item
            }
        })
        this.Items = out
    }

    public instantiate(inv: Inventory) {
        let out: Record<string, string[]> = {}
        for (let histItem of Object.values(this.Items)) {
            Object.assign(out, histItem.instantiate(inv))
        }
        return out
    }
}

module.exports = {
    InventoryItem,
    Inventory,
    HistoryItem,
    History
}