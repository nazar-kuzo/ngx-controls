import { Directive, Input, OnInit } from "@angular/core";
import { MatDatepickerInput } from "@angular/material/datepicker";

import { MatDateFormats } from "@angular/material/core";
import type { AppMatDatepickerInput } from "angular-extensions/models";

/**
 * Forces date/time format in text input view
 */
@Directive({
  selector: "input[format]"
})
export class FormatDirective implements OnInit {

  @Input()
  public format = "";

  private datePicker: AppMatDatepickerInput<Date>;

  constructor(
    datePicker: MatDatepickerInput<Date>,
  ) {
    this.datePicker = datePicker as any as AppMatDatepickerInput<Date>;
  }

  public ngOnInit() {
    this.datePicker._dateFormats = Object.assign(
      {},
      this.datePicker._dateFormats,
      {
        display: { dateInput: this.format }
      } as MatDateFormats);

    // trigger formatting for existing value
    if (this.datePicker.value) {
      this.datePicker._formatValue(this.datePicker.value);
    }
  }
}
