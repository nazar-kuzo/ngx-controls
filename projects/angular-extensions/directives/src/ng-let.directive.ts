import { Directive, Input, TemplateRef, ViewContainerRef } from "@angular/core";

interface NgLetContext<T> {
  $implicit: T;

  ngLet: T;
}


@Directive({
  selector: "[ngLet]"
})
export class NgLetDirective<T> {

  public static ngTemplateGuard_ngLet: "binding";

  private context: NgLetContext<T | null> = { ngLet: null, $implicit: null };
  private hasView = false;

  @Input()
  public set ngLet(value: T) {
    this.context.$implicit = this.context.ngLet = value;
    if (!this.hasView) {
      this.hasView = true;
      this.viewContainer.createEmbeddedView(this.templateRef, this.context);
    }
  }

  constructor(
    private viewContainer: ViewContainerRef,
    private templateRef: TemplateRef<NgLetContext<T>>,
  ) {
  }

  public static ngTemplateContextGuard<T>(dir: NgLetDirective<T>, ctx: any): ctx is NgLetContext<T> {
    return true;
  }
}
