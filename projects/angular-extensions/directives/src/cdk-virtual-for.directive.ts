import { Observable } from "rxjs";
import { Directive, Input, NgIterable, Self } from "@angular/core";
import { DataSource } from "@angular/cdk/collections";
import { CdkVirtualForOf } from "@angular/cdk/scrolling";

@Directive({
  selector: "[cdkVirtualFor]"
})
export class CdkVirtualForOfDirective<T> {

  @Input()
  public cdkVirtualForOf!: DataSource<T> | Observable<T[]> | NgIterable<T>;

  @Input()
  public set cdkVirtualForTrackByProp(prop: keyof T) {
    this.cdkVirtualFor.cdkVirtualForTrackBy = (_: number, item: T) => item[prop];
  }

  constructor(
    @Self() private cdkVirtualFor: CdkVirtualForOf<T>,
  ) {
  }

  public static ngTemplateContextGuard<T>(
    dir: CdkVirtualForOfDirective<T>,
    ctx: unknown
  ): ctx is { $implicit: T; index: number } {
    return true;
  }
}
