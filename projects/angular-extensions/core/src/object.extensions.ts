import { format, parseISO } from "date-fns";
import { reduce, upperFirst, words } from "lodash-es";

export interface StartCaseOptions {
  /**
   * Should insert a space before digit present in string. E.g. "every10Month" => "Every 10 Month"
   */
  insertSpaceBeforeDigits?: boolean;

  /**
   * Should insert a space after digit present in string. E.g. "calculate10e" => "Calculate 10 e"
   */
  insertSpaceAfterDigits?: boolean;

  /**
   * Should insert a space before abbreviation present in string. E.g. "FaceID" => "Face ID"
   */
  insertSpaceBeforeAbbreviations?: boolean;

  /**
   * Should make single letter part present in string. E.g. "pH" => "PH"
   */
  capitalizeSingleLetters?: boolean;
}

declare global {
  interface StartCaseOptions {
    /**
     * Should insert a space before digit present in string. E.g. "every10Month" => "Every 10 Month"
     */
    insertSpaceBeforeDigits?: boolean;

    /**
     * Should insert a space after digit present in string. E.g. "calculate10e" => "Calculate 10 e"
     */
    insertSpaceAfterDigits?: boolean;

    /**
     * Should insert a space before abbreviation present in string. E.g. "FaceID" => "Face ID"
     */
    insertSpaceBeforeAbbreviations?: boolean;

    /**
     * Should make single letter part present in string. E.g. "pH" => "PH"
     */
    capitalizeSingleLetters?: boolean;
  }

  interface String {
    trim(this: string, charList?: string): string;
    trimStart(this: string, charList?: string): string;
    trimEnd(this: string, charList?: string): string;
    toStartCase(this: string, options?: StartCaseOptions): string;
  }

  interface Dictionary<T> {
    [index: string]: T;
  }

  interface Group<TKey, TValue> {
    key: TKey;

    items: TValue[];
  }

  interface FormData {
    fromObject(data: { [key: string]: File | File[] | any }): FormData;
  }

  interface Date {

    /**
     * Returns zero-based index of day of week assuming that week starts with Monday
     *
     * @param this
     * @returns Local date without changing time
     */
    getDayOfWeek(this: Date): number;

    /**
     * Date wont provide Timezone information during serialization.
     *
     * @example
     *  new Date("2020-01-01T00:00:00.000+02:00").toJSON();                   // returns "2019-12-31T22:00:00.000Z"
     *  new Date("2020-01-01T00:00:00.000+02:00").withoutTimezone().toJSON(); // returns "2020-01-01T00:00:00.000"
     *
     * @param this
     * @returns UTC date keeping local time
     */
    withoutTimezone(this: Date): Date;

    /**
     * Converts local date to UTC date keeping local time
     *
     * @param this
     * @returns UTC date keeping local time
     */
    asUtcDate(this: Date): Date;

    /**
     * Converts local date to UTC date with shifted local time
     *
     * @param this
     * @returns UTC date with shifted local time
     */
    toUtcDate(this: Date): Date;

    /**
     * Converts UTC date to local date without changing time
     *
     * @param this
     * @returns Local date without changing time
     */
    asLocalDate(this: Date): Date;
  }

  function nameOf<T>(func: Func<T> | Class<T>): string;
  function nameOfFull<T>(func: Func<T>): string;
}

export type Func<T> = (obj: T) => any;
export type Class<T> = new (...params: any[]) => T;

const ISO8601Regex = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:.\d{1,})?(?:[Z]?|[+-]\d{2}:\d{2}))?$/;

export function nameOf<T>(func: Func<T> | Class<T>) {
  let str = func.toString();
  let classNameRegex = new RegExp(/(?:function|class) ([^ ({]+)[ ({]/);

  if (classNameRegex.test(str)) {
    let classNameParts = classNameRegex.exec(str);

    return classNameParts[classNameParts.length - 1] as string;
  }

  let parts = str.match(/\.([^.;}]+)[;}]?/g);

  return parts[parts.length - 1].replace(".", "") as string;
}

export function nameOfFull<T>(func: Func<T>) {
  return /\.([^;}]+)[;}]?/.exec(func.toString())?.[1] as string;
}

type FunctionLike = (...args: any) => any;

export function overrideFunction<TIntance extends { [prop: string]: TFunc | any }, TFunc extends FunctionLike>(
  context: TIntance,
  funcProvider: (instance: TIntance) => TFunc,
  newFunc: (originalFunc: TFunc, functionContext: TIntance, ...args: Parameters<TFunc>) => ReturnType<TFunc>
) {
  let functionName = nameOf<TIntance>(funcProvider);
  let originalFunction = context[functionName] as TFunc;

  (context[functionName] as any) = function (this: any, ...args: Parameters<TFunc>) {
    let originalFuncInstance = (...newArgs: Parameters<TFunc>) => originalFunction.call(this, ...newArgs);

    return newFunc(originalFuncInstance as any, this, ...args);
  };
}

export function overrideProperty<TIntance extends { [prop: string]: TProp | any }, TProp extends Object>(
  context: TIntance,
  propertyProvider: (instance: TIntance) => TProp,
  propertyConfig: {
    get?: (originalProperty: TProp, propertyContext: TIntance) => TProp;
    set?: (originalProperty: ((value: TProp) => void) | null, propertyContext: TIntance, value: TProp) => void;
  }
) {
  let propertyName = nameOf<TIntance>(propertyProvider);

  let originalProperty = Object.getOwnPropertyDescriptor(context, propertyName) ||
    Object.getOwnPropertyDescriptor(context.__proto__, propertyName);

  let newProperty: PropertyDescriptor = Object.assign({}, originalProperty);

  if (propertyConfig.get) {
    let propertyValue = newProperty.value as TProp;

    delete newProperty.value;

    Object.assign(newProperty, {
      get() {
        return propertyConfig.get(
          originalProperty?.get
            ? Object.setPrototypeOf(Object.assign({}, originalProperty), this).get()
            : propertyValue,
          context);
      },
    });
  }

  if (propertyConfig.set) {
    delete newProperty.value;
    delete newProperty.writable;

    Object.assign(newProperty, {
      set(value: TProp) {
        propertyConfig.set(
          originalProperty?.set
            ? Object.setPrototypeOf(Object.assign({}, originalProperty), this).set
            : null,
          context,
          value);
      },
    });
  }

  Object.defineProperty(context, propertyName, newProperty);
}

export function isValidDateString(date: string) {
  return ISO8601Regex.test(date);
}

export function parseDates(model: any, excludePaths?: RegExp[]) {
  parseDatesInternal(model, excludePaths, "");
}

function parseDatesInternal(model: any, excludePaths?: RegExp[], path?: string) {
  for (let prop in model) {
    if (!model[prop]) {
      continue;
    }

    let propertyPath = [path, prop].join("/");

    if (excludePaths?.some(regExp => regExp.test(propertyPath))) {
      continue;
    }

    if (typeof (model[prop]) == "string") {
      parseDateProperty(model, prop);
    } else if (typeof (model[prop]) == "object") {
      parseDatesInternal(model[prop], excludePaths, propertyPath);
    }
  }
}

export function parseDateProperty<T>(object: T, prop: keyof T) {
  let date = object[prop];

  if (typeof date == "string" && isValidDateString(date)) {
    object[prop] = parseISO(date) as any;
  }
}

/**
 * Date wont provide Timezone information during serialization.
 *
 * @example
 *  new Date("2020-01-01T00:00:00.000+02:00").toJSON();                   // returns "2019-12-31T22:00:00.000Z"
 *  new Date("2020-01-01T00:00:00.000+02:00").withoutTimezone().toJSON(); // returns "2020-01-01T00:00:00.000"
 *
 * @param this
 * @returns UTC date keeping local time
 */
export function withoutTimezone(this: Date): Date {
  let dateWithoutTimezone = new Date(this.valueOf());

  dateWithoutTimezone.toJSON = function (this: Date, key?: any) {
    return format(this, "yyyy-MM-dd'T'HH:mm:ss");
  };

  return dateWithoutTimezone;
}

/**
 * Converts local date to UTC date keeping local time
 *
 * @param this
 * @returns UTC date keeping local time
 */
export function asUtcDate(this: Date) {
  return new Date(`${format(this, "yyyy-MM-dd'T'HH:mm:ss")}Z`);
}

/**
 * Converts local date to UTC date with shifted local time
 *
 * @param this
 * @returns UTC date with shifted local time
 */
export function toUtcDate(this: Date) {
  return new Date(this.toISOString().replace("Z", ""));
}

/**
 * Converts UTC date to local date without changing time
 *
 * @param this
 * @returns Local date without changing time
 */
export function asLocalDate(this: Date) {
  return new Date(format(this, "yyyy-MM-dd'T'HH:mm:ss"));
}

/**
 * Returns zero-based index of day of week assuming that week starts with Monday
 *
 * @param this
 * @returns Local date without changing time
 */
export function getDayOfWeek(this: Date) {
  let dayOfWeek = this.getDay();

  return dayOfWeek == 0
    ? 6
    : dayOfWeek - 1;
}

const originalTrim = String.prototype.trim;

export function trim(this: string, charlist?: string) {
  return charlist
    ? this?.replace(new RegExp("^[" + charlist + "]+|[" + charlist + "]+$"), "")
    : originalTrim.call(this);
}

const originalTrimStart = String.prototype.trimStart;

export function trimStart(this: string, charlist?: string) {
  return charlist
    ? this?.replace(new RegExp("^[" + charlist + "]+"), "")
    : originalTrimStart.call(this);
}

const originalTrimEnd = String.prototype.trimEnd;

export function trimEnd(this: string, charlist?: string) {
  return charlist
    ? this?.replace(new RegExp("[" + charlist + "]+$"), "")
    : originalTrimEnd.call(this);
}

export function handleError(action: () => any) {
  try {
    action();
  }
  catch (error) {
    console.error(error);
  }
}

export function formDataFromObject(this: FormData, data: { [key: string]: File | File[] | any }) {
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      this.append(key, value);
    }
    else if (Array.isArray(value) && value.first() instanceof File) {
      value.forEach(file => this.append(key, file));
    }
    else {
      this.append(key, JSON.stringify(value));
    }
  });

  return this;
}

const ApostropheRegex = RegExp("['\u2019]", "g");

export function toStartCase(this: string, options?: StartCaseOptions): string {
  if (!this) {
    return "";
  }

  return reduce(
    words(this.replace(ApostropheRegex, "")),
    (result, phrase, index) => {
      let infix = "";

      if (index > 0) {
        if (/^\d/.test(phrase)) {
          infix = options?.insertSpaceBeforeDigits ? " " : "";
        }
        else if (/^[A-Z]+$/.test(phrase)) {
          infix = options?.insertSpaceBeforeAbbreviations ? " " : "";
        }
        else if (/\d$/.test(result)) {
          infix = options?.insertSpaceAfterDigits ? " " : "";
        }
        else {
          infix = " ";
        }
      }

      return result + infix + (phrase.length > 1 || options?.capitalizeSingleLetters ? upperFirst(phrase) : phrase);
    },
    "");
}

window.nameOf = nameOf;
window.nameOfFull = nameOfFull;

Date.prototype.getDayOfWeek = getDayOfWeek;
Date.prototype.withoutTimezone = withoutTimezone;
Date.prototype.asUtcDate = asUtcDate;
Date.prototype.toUtcDate = toUtcDate;
Date.prototype.asLocalDate = asLocalDate;
FormData.prototype.fromObject = formDataFromObject;

Object.defineProperty(String.prototype, nameOf(() => String.prototype.trim), { value: trim, configurable: true, writable: true });
Object.defineProperty(String.prototype, nameOf(() => String.prototype.trimStart), { value: trimStart, configurable: true, writable: true });
Object.defineProperty(String.prototype, nameOf(() => String.prototype.trimEnd), { value: trimEnd, configurable: true, writable: true });

Object.defineProperty(
  String.prototype,
  nameOf(() => String.prototype.toStartCase),
  { value: toStartCase, configurable: true, writable: true });
