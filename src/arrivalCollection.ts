import { Arrival } from "./arrival";

export class ArrivalCollection {
    private _arrivalList: Arrival[] = [];

    get list(): Arrival[] {
        return this._arrivalList;
    }
    
    get length(): number {
        return this._arrivalList.length;
    }
    
    get isEmpty(): boolean {
        return this._arrivalList.length === 0;
    }
    
    at(index: number): Arrival {
        if (index < 0) {
            index = this._arrivalList.length + index;
        }

        if (index >= this._arrivalList.length) {
            throw new Error("Index out of bounds");
        }

        return this._arrivalList[index];
    }
    
    push(arrival: Arrival) {
        this._arrivalList.push(arrival);
    }

    clear() {
        this._arrivalList = [];
    }
}
