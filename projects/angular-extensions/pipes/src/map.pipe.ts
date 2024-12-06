import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "map"
})
export class MapPipe implements PipeTransform {

  /**
   * Maps item or collection of items with specified formatter
   *
   * @param value Item or collection of items
   * @param property Item property or formatter
   * @returns Mapped item or collection of items
   */
  public transform<T, TKey extends keyof T>(value: T, property: TKey): T[TKey];
  public transform<T, TKey extends keyof T>(value: T[], property: TKey): T[TKey][];
  public transform<T, TResult>(value: T[], formatter: (value: T) => TResult): TResult[];
  public transform<T, TResult>(value: T, formatter: (value: T) => TResult): TResult;
  public transform<T, TResult>(value: T | T[], propertyOrFormatter: keyof T | ((value: T) => TResult)): TResult | TResult[] {
    let formatter: (value: T) => TResult;

    if (typeof propertyOrFormatter == "function") {
      formatter = propertyOrFormatter;
    }
    else {
      let property = propertyOrFormatter;

      formatter = (item: T) => item[property] as any as TResult;
    }

    if (Array.isArray(value)) {
      return value.map(formatter);
    }
    else {
      return formatter(value);
    }
  }
}
