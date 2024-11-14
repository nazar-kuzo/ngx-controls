import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  ComponentRef, ElementRef, EventEmitter, Inject, Input, OnChanges, Output, ViewChild,
} from "@angular/core";
import { MatCalendarHeader, MatCalendarView, MatDatepicker, MatDatepickerContent } from "@angular/material/datepicker";
import { MatDateFormats, MAT_DATE_FORMATS } from "@angular/material/core";
import type { CdkPortalOutlet } from "@angular/cdk/portal";

import { overrideFunction, SimpleChanges } from "angular-extensions/core";
import { ControlBase, ActionableControl } from "angular-extensions/controls/base-control";
import { AppMatDatepicker, Field } from "angular-extensions/models";

@Component({
  selector: "date-control",
  templateUrl: "./date-control.component.html",
  styleUrls: ["./date-control.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateControlComponent<TOption, TOptionGroup, TFormattedValue, TControlValue>
  extends ControlBase<Date, TOption, TOptionGroup, TFormattedValue, TControlValue>
  implements ActionableControl, OnChanges {

  @Input()
  public targetView: "year" | "month" | "day" = "day";

  @Input()
  public startView: MatCalendarView = "month";

  @Input()
  public format: string;

  @Input()
  public clearable: boolean;

  @Input()
  public actionButtonVisible = true;

  @Input()
  public actionButtonIcon?: string;

  @Input()
  public actionButtonTooltip?: string;

  @Output()
  public actionButton = new EventEmitter<Field<Date, TOption, TOptionGroup, TFormattedValue, TControlValue>>();

  @ViewChild(MatDatepicker, { static: true })
  public datePicker: AppMatDatepicker<Date>;

  private get datepickerContent(): MatDatepickerContent<Date> | null {
    return (this.datePicker._componentRef || this.datePicker._popupComponentRef)?.instance;
  }

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DATE_FORMATS) private dateFormats: MatDateFormats,
  ) {
    super();

    this.format = dateFormats.display.dateInput;

    // avoid datepicker input blur while popup is open
    elementRef
      .nativeElement
      .addEventListener("blur", event => this.datepickerContent && event.stopPropagation(), { capture: true });
  }

  public ngOnChanges(changes: SimpleChanges<DateControlComponent<TOption, TOptionGroup, TFormattedValue, TControlValue>>) {
    if (changes.targetView) {
      if (changes.targetView.currentValue == "year") {
        this.startView = "multi-year";
        this.format = "yyyy";
      }
      else if (changes.targetView.currentValue == "month") {
        this.startView = "year";
        this.format = this.dateFormats.display.monthYearA11yLabel;
      }
      else if (changes.targetView.currentValue == "day") {
        this.startView = "month";
        this.format = this.dateFormats.display.dateInput;
      }

      this.changeDetectorRef.markForCheck();
    }
  }

  public onFieldClick(event: MouseEvent) {
    if (this.elementRef.nativeElement.querySelector(".mat-form-field-flex").contains(event.target as HTMLElement)) {
      this.datePicker.open();
    }

    event.preventDefault();
  }

  public dateSelected(date: Date) {
    this.datePicker._model.add(date.withoutTimezone());

    this.datePicker.close();

    // hide content since we cannot prevent currentView showing next view
    if (this.datepickerContent) {
      (this.datepickerContent._elementRef.nativeElement as HTMLElement).style.display = "none";
    }

    this.changeDetectorRef.markForCheck();
  }

  public viewChanged(view: MatCalendarView) {
    // fix issue when clicking on year selector it shows "month" view which is not correct
    if (this.targetView == "month" && view == "month") {
      if (this.datepickerContent) {
        this.datepickerContent._calendar.currentView = "multi-year";
      }

      this.changeDetectorRef.markForCheck();
    }
  }

  public onToggle(event: MouseEvent) {
    if (this.clearable && this.field.control.enabled && this.field.value != null) {
      this.field.control.setValue(null);

      this.field.control.markAsTouched({ onlySelf: true });

      event.preventDefault();
      event.stopImmediatePropagation();

      this.changeDetectorRef.markForCheck();
    }
    else {
      this.focus();
    }
  }

  public datePickerOpened() {
    setTimeout(() => this.tryPatchPeriodButton(this.datepickerContent));
  }

  private tryPatchPeriodButton(datePickerContent: MatDatepickerContent<Date, Date>) {
    let calendarHeader = (((datePickerContent
      ._calendar
      ._calendarHeaderPortal as any)
      ._attachedHost as CdkPortalOutlet)
      .attachedRef as ComponentRef<MatCalendarHeader<Date>>)
      .instance;

    overrideFunction(
      calendarHeader,
      header => header.currentPeriodClicked,
      currentPeriodClicked => {
        if (this.targetView == "year") {
        }
        else if (this.targetView == "month") {
          calendarHeader.calendar.currentView = calendarHeader.calendar.currentView == "year" ? "multi-year" : "year";
        }
        else {
          currentPeriodClicked();
        }
      });
  }
}
