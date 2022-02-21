import { of, Subject } from "rxjs";
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil, tap } from "rxjs/operators";
import {
  Component, OnInit, Input, Optional, ElementRef, ChangeDetectorRef,
  ViewChild, OnDestroy, AfterViewInit, ContentChild, TemplateRef, ChangeDetectionStrategy,
} from "@angular/core";
import { MatOption } from "@angular/material/core";
import { MatSelect } from "@angular/material/select";
import { MatFormFieldAppearance } from "@angular/material/form-field";
import { FormControl } from "@angular/forms";
import { MatMenuTrigger } from "@angular/material/menu";

import { Field } from "angular-extensions/models";
import { overrideFunction } from "angular-extensions/core";
import { MatOptionWithContext } from "./option-context/option-context.directive";

@Component({
  selector: "select-control",
  templateUrl: "./select-control.component.html",
  styleUrls: ["./select-control.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectControlComponent<TValue, TOption> implements OnInit, AfterViewInit, OnDestroy {

  @Input()
  public field: Field<TValue, TOption>;

  @Input()
  public fieldClass: string;

  @Input()
  public dropdownClass = "";

  @Input()
  public appearance: MatFormFieldAppearance = "outline";

  @Input()
  public multiple: boolean;

  @Input()
  public searchable: boolean;

  @Input()
  public clearable: boolean;

  @Input()
  public showSelectAll = false;

  @Input()
  public tooltipDisabled = false;

  @Input()
  public filter = "";

  @ViewChild("select", { static: true })
  public select: MatSelect;

  @ViewChild("selectAllOption")
  public selectAllOption: MatOption;

  @ContentChild("optionTemplate", { static: true })
  public optionTemplate: TemplateRef<{ $implicit: string; option: TOption }>;

  @ContentChild("triggerTemplate", { static: true })
  public triggerTemplate: TemplateRef<{ $implicit: string; option: TOption | TOption[] }>;

  public get selectedOption() {
    if (Array.isArray(this.select?.selected)) {
      return (this.select.selected as MatOptionWithContext<TOption>[]).map(option => option.context);
    }
    else {
      return (this.select.selected as MatOptionWithContext<TOption>)?.context;
    }
  }

  public get triggerLabel() {
    let selectedOption = this.selectedOption;

    if (Array.isArray(selectedOption)) {
      return selectedOption.map(option => this.field.optionLabel(option)).join(", ");
    }
    else if (selectedOption) {
      return this.field.optionLabel(selectedOption);
    }
    else {
      return "";
    }
  }

  private destroy = new Subject();

  public filterControl = new FormControl();

  constructor(
    elementRef: ElementRef<HTMLElement>,
    private changeDetectorRef: ChangeDetectorRef,
    @Optional() matMenuTrigger: MatMenuTrigger,
  ) {
    // provides ability to have select-control to open
    // custom popup menu without processing actual event
    if (matMenuTrigger) {
      elementRef.nativeElement.addEventListener(
        "click",
        event => {
          matMenuTrigger.openMenu();

          event.stopPropagation();
        },
        { capture: true });
    }
  }

  public ngOnInit() {
    this.filterControl.setValue(this.filter);

    this.field.optionChanges
      .pipe(takeUntil(this.destroy))
      .subscribe(() => this.changeDetectorRef.markForCheck());

    if (this.multiple && this.showSelectAll) {
      this.select.optionSelectionChanges
        .pipe(
          debounceTime(0),
          takeUntil(this.destroy))
        .subscribe(() => {
          let selectedOptions = this.select.selected as MatOption[];

          this.setSelectAllState(selectedOptions?.length > 0 && selectedOptions?.length == this.field.options?.length);
        });
    }
  }

  public ngAfterViewInit() {
    if (this.field.optionDisplayLabel) {
      let optionViewLabel = this.field.optionDisplayLabel;

      this.select.options.changes
        .pipe(takeUntil(this.destroy))
        .subscribe((options: MatOption[]) => {
          options.forEach(option => {
            Object.defineProperty(option, nameOf(() => option.viewValue), {
              get: () => optionViewLabel(option.value as TOption),
              configurable: true,
            });
          });
        });
    }

    if (this.searchable && this.multiple && this.select) {
      // fixing issue with select control not propagating
      // changes to model when options filtering is applied
      overrideFunction(
        this.select,
        select => (select as any)._initializeSelection,
        (_, select) => {
          Promise.resolve().then(() => {
            (select as any)._setSelectionByValue([...(select.ngControl.value || []), ...((select as any)._value || [])]);
            select.stateChanges.next();
          });
        });
    }

    if (this.multiple && this.showSelectAll) {
      this.selectAllOption._getHostElement().addEventListener(
        "click",
        event => {
          this.toggleSelectAll();
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        { capture: true });
    }

    if (this.searchable && this.field.optionsProvider) {
      let optionsProvider = this.field.optionsProvider;

      this.filterControl.valueChanges
        .pipe(
          filter((query: string) => query != ""),
          distinctUntilChanged(),
          tap(() => {
            this.field.options = [];
            this.field.isQuerying = true;
          }),
          debounceTime(300),
          switchMap((query: string) => !!query
            ? optionsProvider(query).pipe(catchError(() => of([] as TOption[])))
            : of([])),
          takeUntil(this.destroy))
        .subscribe(options => {
          this.field.options = options;
          this.field.isQuerying = false;
        });
    }
  }

  public ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  public optionTracker = (index: number, option: TOption) => {
    return this.field.optionId(option, index);
  };

  public optionComparer = (left?: TOption, right?: TOption) => {
    return left != null && right != null && this.field.optionId(left) == this.field.optionId(right);
  };

  private toggleSelectAll() {
    let shouldSelect = (this.select.selected as MatOption[])?.length < this.field.options?.length;

    this.select.options
      .filter(option => !option.disabled && option.id != this.selectAllOption.id)
      .forEach(option => {
        if (shouldSelect) {
          option.select();
        }
        else {
          option.deselect();
        }
      });

    this.setSelectAllState(shouldSelect);
  }

  private setSelectAllState(selected: boolean) {
    if (this.selectAllOption) {
      (this.selectAllOption as any)._selected = selected;
      (this.selectAllOption as any)._changeDetectorRef.markForCheck();
    }
  }
}
