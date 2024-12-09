import { NgFor } from "@angular/common";
import { Directive, EmbeddedViewRef, Input, OnChanges, TemplateRef, ViewContainerRef } from "@angular/core";
import { SimpleChanges } from "angular-extensions/core";

@Directive({
  selector: "[ngFor]"
})
export class NgForDirective<T> implements OnChanges {

  @Input()
  public ngForOf?: T[];

  @Input()
  public ngForTrackByProp?: keyof T;

  @Input()
  public ngForEmpty?: TemplateRef<unknown>;

  private ngForEmptyViewRef?: EmbeddedViewRef<unknown>;

  constructor(
    private ngFor: NgFor<T>,
    private viewContainerRef: ViewContainerRef,
  ) {
  }

  public ngOnChanges(changes: SimpleChanges<NgForDirective<T>>): void {
    if (changes.ngForTrackByProp && changes.ngForTrackByProp.currentValue != changes.ngForTrackByProp.previousValue) {
      this.ngFor.ngForTrackBy = (_, item) => item[this.ngForTrackByProp];
    }

    if (this.ngForEmpty) {
      if (this.ngForEmptyViewRef && this.ngForOf?.length > 0) {
        this.ngForEmptyViewRef.destroy();
        this.ngForEmptyViewRef = undefined;
      }
      else if (!this.ngForEmptyViewRef && !this.ngForOf?.length) {
        this.ngForEmptyViewRef = this.viewContainerRef.createEmbeddedView(this.ngForEmpty);
      }
    }
  }
}
