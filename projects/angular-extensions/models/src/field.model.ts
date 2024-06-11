import { xorBy } from "lodash-es";
import { Observable, of, Subject } from "rxjs";
import { catchError, filter as filterPredicate, first, map, pairwise, startWith, takeUntil } from "rxjs/operators";
import { FormControl, FormGroup } from "@angular/forms";

import { handleError, toStartCase, type StartCaseOptions } from "angular-extensions/core";
import { DatePipe, DateTimePipe } from "angular-extensions/pipes";
import { Validation, ValidationConstructor } from "./validation.model";
import { NGX_DATE_FORMATS } from "./datetime-configuration.model";

/**
 * Constructor object for Field class
 */
type FieldConstructor<TValue, TOption = TValue, TOptionGroup = any, TFormattedValue = any, TControlValue = any> =
  Partial<Omit<Field<TValue, TOption, TOptionGroup, TFormattedValue, TControlValue>,
    "control" | "element" | "options" | "onValueChange" | "onOptionsChange" | "validation" |
    "customOptionFilterPredicate" | "_initialStatus" | "destroy" | "setOptions" | "setFromOptions" |
    "updateValidation" | "visible" | "formattedValue" | "formGroup" | "optionChanges" | "destroy$"> & {
      options: TOption[] | Observable<TOption[]>;

      onValueChange: (value: TValue, previous: TValue) => void;

      onOptionsChange: (value: TOption[]) => void;

      validation: ValidationConstructor<TValue>;

      /**
       * Indicates field initial state
       */
      disabled: boolean;

      /**
       * Configures when {@link valueChanges} should emit event.
       */
      updateOn?: "change" | "blur" | "submit";
    }>;

/**
 * Commonly used Field value formatters
 */
export const Formatters = {

  /**
   * Formats Field<Date> value to UTC date ("yyyy-MM-dd") string.
   *
   * @param field Field<Date>
   * @returns String
   */
  utcDateFormatter: (field: Field<Date, any>): string => {
    return new DatePipe(NGX_DATE_FORMATS).transform(field.value, "yyyy-MM-dd");
  },

  /**
   * Formats Field<Date> value to UTC date/time ("yyyy-MM-dd'T'HH:mm:ss'Z'") string.
   *
   * @param field Field<Date>
   * @returns String
   */
  utcDateTimeFormatter: (field: Field<Date, any>): string => {
    return new DatePipe(NGX_DATE_FORMATS).transform(field.value?.toUtcDate(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
  },

  /**
   * Formats Field<Date> value to date string with {@link DatePipe} and {@link NGX_DATE_FORMATS}
   *
   * @param field Field<Date>
   * @returns String
   */
  dateFormatter: (field: Field<Date, any>) => {
    return new DatePipe(NGX_DATE_FORMATS).transform(field.value);
  },

  /**
   * Formats Field<Date> value to date/time string with {@link DateTimePipe} and {@link NGX_DATE_FORMATS}
   *
   * @param field Field<Date>
   * @returns String
   */
  dateTimeFormatter: (field: Field<Date, any>) => {
    return new DateTimePipe(NGX_DATE_FORMATS).transform(field.value);
  }
};

/**
 * Field <=> Control value converter.
 * Useful when HTML input has different model that actual Field.
 *
 * @template TFieldValue Field Value
 * @template TControlValue Field's Control Value
 */
interface FieldControlValueConverter<TFieldValue, TControlValue> {

  fromControlValue: (value: TControlValue) => TFieldValue;

  toControlValue: (value: TFieldValue) => TControlValue;
}

interface FormatterOptions {
  insertSpaceBeforeDigits?: boolean;
  insertSpaceBeforeAbbreviations?: boolean;
}

/**
 * Field option that can be used in select-control, etc.
 */
export class Option<TValue, TId = string> {

  public id: TId;

  public name: string;

  public label: string;

  public value: TValue;

  constructor(props?: Partial<Option<TValue, TId>>) {
    Object.assign(this, props);

    if (!this.name) {
      this.name = this.value?.toString();
    }

    if (!this.id) {
      this.id = this.name as any;
    }
  }

  /**
   * Creates options from specified Enum
   *
   * @param enumType Enum type
   * @param options Label formatter options
   * @returns Collection of options
   */
  public static ForEnum<TEnum extends number | string>(
    enumType: any,
    options: StartCaseOptions = {}): Option<TEnum>[] {
    let entries = Object.entries(enumType) as [string, string | number][];;

    let numberEntries = entries.filter(([, value]) => typeof value == "number") as [string, number][];

    return (numberEntries.length > 0 ? numberEntries : entries)
      .map(([key, value]: [string, string | number]) => {
        return Object.assign(new Option<TEnum>({
          label: toStartCase.call(key ?? "", options),
          name: key,
          value: value as TEnum,
        }));
      });
  }
}

/**
 * Provides simplified api to work with Angular reactive forms and predefined control components.
 */
export class Field<TValue, TOption = TValue, TOptionGroup = any, TFormattedValue = any, TControlValue = TValue> {

  private optionChanges$ = new Subject<TOption[]>();

  private _options: TOption[] = [];

  public _initialStatus: { disabled: boolean };

  public readonly destroy$ = new Subject();

  /**
   * Angular FormControl of field. Control components communicates via this control between Field and UI
   */
  public control: FormControl<TControlValue>;

  /**
   * Reference to control root HTML element
   */
  public element?: HTMLElement;

  /**
   * Name of a field inside parent's FormGroup, etc.
   */
  public name: string;

  /**
   * Placeholder of a field
   */
  public placeholder?: string;

  /**
   * Label of a field
   */
  public label?: string;

  /**
   * Info text of field showed in mat-hint
   */
  public info?: string;

  /**
   * Validations of a field
   */
  public validation: Validation<TValue>;

  /**
   * Field value formatter which is used by {@link formattedValue}. See list of built-in {@link Formatters}
   */
  public formatter: (field: Field<TValue, TOption, TOptionGroup, TFormattedValue, TControlValue>) => TFormattedValue;

  /**
   * Field's Control value converter, conversion is done whenever value is being read from/written to a {@link control}.
   */
  public controlConverter: FieldControlValueConverter<TValue, TControlValue> = {
    fromControlValue: controlValue => controlValue as any as TValue,
    toControlValue: value => value as any as TControlValue,
  };

  /**
   * Configures when field should be visible, by default is always visible.
   */
  public visibilityProvider?: () => boolean;

  /**
   * Highlights field
   */
  public highlight?: (value?: any) => void;

  /**
   * Determines whether field is querying data: options, etc.
   */
  public isQuerying: boolean;

  /**
   * Gets field's parent as form group
   */
  public get formGroup() {
    return this.control?.parent as FormGroup | null;
  }

  /**
   * Gets field's visibility status. Based on {@link visibilityProvider}.
   */
  public get visible() {
    return !this.visibilityProvider || this.visibilityProvider();
  }

  /**
   * Sets field's visibility status. Based on {@link visibilityProvider}.
   */
  public set visible(isVisible: boolean) {
    this.visibilityProvider = () => !!isVisible;

    this.control.updateValueAndValidity();
  }

  /**
   * Gets field's value. Applies conversion if specified at {@link controlConverter}.
   */
  public get value() {
    return this.controlConverter.fromControlValue(this.control.value);
  }

  /**
   * Sets field's value. Applies conversion if specified at {@link controlConverter}.
   * If previous value is the same as current value, {@link onValueChange} wont emit changes
   */
  public set value(value: TValue) {
    let convertedValue = this.controlConverter.toControlValue(value);

    if (convertedValue !== this.control.value) {
      this.control.setValue(convertedValue, { onlySelf: true });
    }
  }

  /**
   * Gets formatted value, applies {@link formatter} if exists
   */
  public get formattedValue(): TFormattedValue {
    return this.formatter
      ? this.formatter(this)
      : this.value as any;
  }

  /**
   * Gets Field's options
   */
  public get options(): TOption[] {
    return this._options;
  }

  /**
   * Sets Field's options and notifies subscribers.
   */
  public set options(value: TOption[]) {
    this._options = value;

    if (this.value != null && this.updateValueWhenOptionsChanged) {
      this.setFromOptions(option => {
        if (this.value instanceof Array) {
          return this.value.map(this.optionId).contains(this.optionId(option));
        }
        else {
          return this.value?.valueOf() == this.optionValue(option)?.valueOf() ||
            this.optionId(this.value as any) == this.optionId(option);
        }
      });
    }

    // triggers change detection for internal controls
    this.control.setErrors(this.control.errors);

    this.optionChanges$.next(value);
  }

  /**
   * Gets option changes stream
   */
  public get optionChanges() {
    return this.optionChanges$.asObservable().pipe(takeUntil(this.destroy$));
  }

  public readonly customOptionFilterPredicate: boolean;

  /**
   * Indicates whether field values should be updated when options changed.
   */
  public updateValueWhenOptionsChanged: boolean;

  /**
   * Configures when Field should be destroyed.
   * If "control" - Field is destroyed when control ngOnDestroy method called.
   * If "editor" - Field is destroyed when editor destroy method called.
   *
   * @default Default value: "control"
   */
  public destoryWith: "control" | "editor" = "control";

  /**
   * Options filter predicate that is used by select-control, by default filters by option label
   */
  public optionsFilterPredicate: (option: TOption, filter: string) => boolean;

  /**
   * Custom option identifier that is used by select-control to compare options
   */
  public optionId: (option: TOption, index?: number) => number | string;

  /**
   * Custom option label provider that is used by select-control
   */
  public optionLabel: (option: TOption) => string;

  /**
   * Allows to specify option display label when selected or being hovered
   */
  public optionDisplayLabel?: (option: TOption) => string;

  /**
   * Custom option value provider that is used by select-control
   */
  public optionValue: (option: TOption) => TControlValue;

  /**
   * Custom option availability provider that is used by select-control
   */
  public optionDisabled: (option: TOption) => boolean;

  /**
   * Options provider function accepting string query
   */
  public optionsProvider?: (query: string) => Observable<TOption[]>;

  /**
   * Options group provider that is used by select-control.
   */
  public optionsGroupProvider?: (option: TOption) => TOptionGroup;

  /**
   * Custom option group label provider that is used by select-control
   */
  public optionGroupLabel: (optionGroup: TOptionGroup) => string;

  constructor(props: FieldConstructor<TValue, TOption, TOptionGroup, TFormattedValue, TControlValue>) {
    this.validation = new Validation(props.validation || {});

    this.control = new FormControl(
      {
        value: this.controlConverter.toControlValue(props.value),

        // suppresses validation that might have dependencies
        // on other fields that are not currently instantiated
        disabled: props.disabled !== undefined
          ? props.disabled
          : true,
      },
      {
        validators: Validation.getValidators(this.validation),
        asyncValidators: Validation.getAsyncValidators(this.validation),
        updateOn: props.updateOn,
      });

    this.customOptionFilterPredicate = !!props.optionsFilterPredicate;

    // do not filter option if search provider is used
    this.optionsFilterPredicate = props.optionsProvider
      ? () => true
      : (option, filter) => this.optionLabel(option)?.toLowerCase().includes(filter.toLowerCase());

    this.optionGroupLabel = optionGroup => optionGroup?.toString();
    this.optionId = option => option instanceof Option ? option.id : option;
    this.optionLabel = option => option instanceof Option ? option.label : option?.toString();
    this.optionValue = option => option instanceof Option ? option.value : option;
    this.optionDisabled = _ => false;

    // indicated form that control should remain disabled
    if (props.disabled) {
      this._initialStatus = { disabled: props.disabled };

      delete props.disabled;
    }

    if (props.onValueChange) {
      let onValueChange = props.onValueChange;

      this.control
        .valueChanges
        .pipe(
          filterPredicate(() => this.control.enabled),
          map(this.controlConverter.fromControlValue),
          startWith(props.value),
          pairwise(),
          takeUntil(this.destroy$),
        )
        .subscribe(([previous, current]) => handleError(() => onValueChange(current as TValue, previous)));

      delete props.onValueChange;
    }

    if (props.onOptionsChange) {
      let onOptionsChange = props.onOptionsChange;

      this.optionChanges$
        .pipe(takeUntil(this.destroy$))
        .subscribe(options => handleError(() => onOptionsChange(options)));

      delete props.onOptionsChange;
    }

    if (props.options) {
      this.setOptions(props.options);

      delete props.options;
    }

    delete props.validation;

    Object.assign(this, props);
  }

  /**
   * Sets Field's options. Subscribes to Observable input and tracks status in {@link isQuerying} property
   */
  public setOptions(value: TOption[] | Observable<TOption[]>) {
    if (value instanceof Observable) {
      this.isQuerying = true;

      // emit control status change event to trigger change detection by controls
      this.control.markAsPending({ onlySelf: true });

      value
        .pipe(
          first(),
          catchError(error => {
            console.error(error);

            return of([]);
          }))
        .subscribe({
          next: options => {
            this.options = options;
            this.isQuerying = false;

            // opposite action to "control.markAsPending"
            this.control.setErrors(this.control.errors);
          }
        });
    }
    else {
      this.options = value;
    }
  }

  /**
   * Selects values from available options based on options predicate. Honors
   *
   * @param optionPredicate Options predicate that will select values from
   * @param config Configures default value if nothing selected or should it emit value change event.
   * @returns Promise
   */
  public setFromOptions(
    optionPredicate: (option: TOption) => boolean,
    config: { defaultValue?: TValue; emitEvent?: boolean } = { defaultValue: undefined, emitEvent: true },
  ) {
    return new Promise<void>(resolve => {
      let optionsProvider = () => {
        if (this.control.value instanceof Array) {
          let value = this.options.filter(optionPredicate).map(this.optionValue);

          if (xorBy(this.control.value, value, this.optionId as any).length > 0) {
            this.control.setValue(value as any as TControlValue, { emitEvent: config.emitEvent });
          }
        }
        else {
          let value = this.optionValue(this.options.find(optionPredicate)) ?? this.controlConverter.toControlValue(config.defaultValue);

          if (value != null && this.control.value != null &&
            this.optionId(value as any)?.valueOf() !== this.optionId(this.control.value as any)?.valueOf()
          ) {
            this.control.setValue(value, { emitEvent: config.emitEvent });
          }
          else if ((value != null) != (this.control.value != null)) {
            this.control.setValue(value, { emitEvent: config.emitEvent });
          }
        }

        resolve();
      };

      if (this.isQuerying) {
        this.optionChanges$
          .pipe(first())
          .subscribe(() => optionsProvider());
      }
      else {
        optionsProvider();
      }
    });
  }

  /**
   * Updates field validation
   *
   * @param validation Validation constructor parameters
   */
  public updateValidation(validation: ValidationConstructor<TValue>) {
    Object.assign(this.validation, new Validation(validation));

    this.control.setValidators(Validation.getValidators(this.validation));
    this.control.setAsyncValidators(Validation.getAsyncValidators(this.validation));
  }

  /**
   * Destroys field and its subscriptions
   */
  public destroy() {
    this.destroy$.next(null);
    this.destroy$.complete();
  }
}
