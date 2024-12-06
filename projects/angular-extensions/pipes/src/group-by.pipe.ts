import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "groupBy"
})
export class GroupByPipe implements PipeTransform {

  /**
   * Groups collection of items by property selector
   *
   * @param items Collection of items
   * @param key Property selector or property name
   * @returns Collection of grouped items, see {@link Group} for more details
   */
  public transform<T, TKey extends keyof T>(items: T[], key: TKey): Group<T[TKey], T>[];
  public transform<T, TKey>(items: T[], key: (item: T) => TKey): Group<TKey, T>[];
  public transform<T, TKey>(items: T[], key: keyof T | ((item: T) => TKey)): Group<TKey, T>[] {
    let propertySelector: (item: T) => TKey;

    if (typeof key == "function") {
      propertySelector = key;
    }
    else {
      propertySelector = (item: T) => item[key] as any as TKey;
    }

    return items.groupBy(propertySelector);
  }
}
