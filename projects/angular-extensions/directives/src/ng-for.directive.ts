import { NgFor } from "@angular/common";
import { Directive, EmbeddedViewRef, Input, OnChanges, Self, TemplateRef, ViewContainerRef } from "@angular/core";

@Directive({
  selector: "[ngFor]"
})
export class NgForDirective<T> implements OnChanges {

  @Input()
  public ngForOf?: Iterable<T>;

  @Input()
  public set ngForTrackByProp(prop: keyof T) {
    this.ngFor.ngForTrackBy = (_: number, item: T) => item[prop];
  }

  @Input()
  public ngForEmpty?: TemplateRef<unknown>;

  private ngForEmptyViewRef?: EmbeddedViewRef<unknown>;

  constructor(
    @Self() private ngFor: NgFor<T>,
    private viewContainerRef: ViewContainerRef,
  ) {
  }

  public ngOnChanges(): void {
    if (this.ngForEmpty) {
      if (this.ngForEmptyViewRef && (this.ngForOf as Array<T>)?.length > 0) {
        this.ngForEmptyViewRef.destroy();
        this.ngForEmptyViewRef = undefined;
      }
      else if (!this.ngForEmptyViewRef && !(this.ngForOf as Array<T>)?.length) {
        this.ngForEmptyViewRef = this.viewContainerRef.createEmbeddedView(this.ngForEmpty);
      }
    }
  }
}
