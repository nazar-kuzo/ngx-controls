import { Observable } from "rxjs";
import { CdkCellDef, CdkRowDef } from "@angular/cdk/table";
import { Directive, Input } from "@angular/core";
import { MatCellDef, MatRowDef, MatTableDataSource } from "@angular/material/table";

@Directive({
  selector: "[matCellDef]",
  providers: [
    { provide: CdkCellDef, useExisting: MatCellDefDirective },
  ],
})
export class MatCellDefDirective<T, TValue> extends MatCellDef {

  @Input()
  public matCellDefDataSource: T[] | Observable<T[]> | MatTableDataSource<T>;

  public value: TValue;

  public static ngTemplateContextGuard<T, TValue>(
    dir: MatCellDefDirective<T, TValue>,
    ctx: unknown
  ): ctx is { $implicit: T; index: number } {
    return true;
  }
}

@Directive({
  selector: "[matRowDef]",
  providers: [
    { provide: CdkRowDef, useExisting: MatRowDefDirective },
  ],
})
export class MatRowDefDirective<T> extends MatRowDef<T> {

  @Input()
  public matRowDefDataSource: T[] | Observable<T[]> | MatTableDataSource<T>;

  public static ngTemplateContextGuard<T>(
    dir: MatRowDefDirective<T>,
    ctx: unknown
  ): ctx is { $implicit: T; index: number } {
    return true;
  }
}
