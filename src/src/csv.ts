import * as csv from "csv-parse"
import * as fs from "fs"

export class CSVFileParse<T extends Record<string, string> = Record<string, string>> {
    public parser: csv.Parser
    public header: string[]
    public records: T[]
    public complete: Promise<T[]>
    public constructor(FileString: string) {
        this.parser = csv.parse()
        this.records = [];
        this.header = [];
        this.complete = new Promise<T[]>((resolve, reject) => {
            this.parser.on('end', () => {
                resolve(this.records)
            })
            this.parser.on('error', reject);
        })
        this.parser.on('readable', () => {
            let record;
            while ((record = this.parser.read() as string[]) !== null) {
                if (this.header.length == 0) {
                    this.header = record.map((r): string => {
                        return r.split("").map((char): string => {
                            return char.match(/[a-zA-Z]/) ? char : ""
                        }).join("")
                    })
                } else {
                    let out = {} as any
                    for (let i = 0; i < this.header.length; i++) {
                        out[this.header[i]] = record[i]
                    }
                    this.records.push(out as T);
                }
            }
        });
        fs.createReadStream(FileString).pipe(this.parser)
    }
}

module.exports = {
    CSVFileParse
}