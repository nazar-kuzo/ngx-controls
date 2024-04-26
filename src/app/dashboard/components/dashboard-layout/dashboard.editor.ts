import { of } from "rxjs";
import { delay, map } from "rxjs/operators";
import { Injectable } from "@angular/core";
import { ApiService, BaseEditor, DayOfWeek, Field, Formatters, Option, TimeOfDay } from "angular-extensions";

export interface Country {

  cca3: string;

  name: { common: string };
}

@Injectable()
export class DashboardEditor extends BaseEditor {

  public firstName: Field<string>;

  public lastName: Field<string>;

  public email: Field<string>;

  public phone: Field<string>;

  public website: Field<string>;

  public yearsOld: Field<number>;

  public yearOfBirth: Field<Date>;

  public monthOfBirth: Field<Date>;

  public dateOfBirth: Field<Date, any, any, string>;

  public dateTimeOfBirth: Field<Date>;

  public timeOfBirth: Field<TimeOfDay, any, any, string, Date>;

  public vacationFrom: Field<Date>;

  public vacationTo: Field<Date>;

  public dayOfBirth: Field<DayOfWeek, Option<DayOfWeek>>;

  public country: Field<Country>;

  public image: Field<File[]>;

  public allies: Field<Country[], Country>;

  public anthem: Field<string>;

  public isOfficial: Field<boolean>;

  public customOptions: Field<number[], Option<number, number>>;

  constructor(
    private api: ApiService,
  ) {
    super();

    this.firstName = new Field({
      label: "First Name",
      validation: {
        required: { value: true },
        maxLength: { value: () => this.lastName.value?.length || 10, text: "First Name cannot be longer than the Last Name" }
      },
    });

    this.lastName = new Field({
      label: "Last Name",
      validation: {
        required: { value: () => !!this.firstName.value }
      },
    });

    this.email = new Field({
      label: "Email",
      validation: {
        required: { value: true },
        native: { text: "Email is not valid" },
      },
    });

    this.phone = new Field({
      label: "Phone",
      validation: {
        required: { value: true }
      },
    });

    this.website = new Field({
      label: "Website",
      validation: {
        required: { value: true },
        native: { text: "URL is not valid" },
      },
    });

    this.yearsOld = new Field({
      label: "Years old",
      validation: {
        required: { value: true },
      },
    });

    this.yearOfBirth = new Field<Date>({
      label: "Year of Birth",
      validation: {
        required: { value: true }
      },
    });

    this.monthOfBirth = new Field<Date>({
      label: "Month of Birth",
      validation: {
        required: { value: true }
      },
    });

    this.dateOfBirth = new Field<Date, any, any, string>({
      label: "Date of Birth",
      formatter: Formatters.dateFormatter,
      validation: {
        required: { value: true }
      },
    });

    this.dateTimeOfBirth = new Field<Date>({
      label: "Date/Time of Birth",
      validation: {
        required: { value: true }
      },
    });

    this.timeOfBirth = new Field<TimeOfDay, any, any, string, Date>({
      label: "Time of Birth",
      validation: {
        required: { value: true }
      },
      controlConverter: {
        toControlValue: TimeOfDay.toLocalDate,
        fromControlValue: TimeOfDay.parse,
      },
    });

    this.vacationFrom = new Field<Date>({
      label: "Vacation from",
      validation: {
        required: { value: true },
        maxDate: { value: () => this.vacationTo.value }
      },
    });

    this.vacationTo = new Field<Date>({
      label: "Vacation to",
      validation: {
        required: { value: true },
        minDate: { value: () => this.vacationFrom.value }
      },
    });

    this.dayOfBirth = new Field<DayOfWeek, Option<DayOfWeek>>({
      label: "Day of Birth",
      validation: {
        required: { value: true }
      },
      options: Option.ForEnum<DayOfWeek>(DayOfWeek),
    });

    this.image = new Field<File[]>({
      label: "Image",
      validation: {
        required: { value: true }
      }
    });

    this.country = new Field<Country, Country>({
      label: "Country",
      info: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." +
        "Ut lacus metus, molestie sed mi non, accumsan molestie elit.",
      validation: {
        required: { value: true },
        async: {
          value: country => {
            console.error(`Triggered async validation`);

            return of(country?.name.common != "Russia").pipe(delay(1000));
          },
          text: "Invalid async error",
        }
      },
      optionId: country => country.cca3,
      optionLabel: country => country.name.common,
      onValueChange: country => {
        console.error(`Selected country: ${country?.name.common}`);
      },
      options: this.loadAllCountries(),
      optionsProvider: query => this.api.get<Country[]>(`https://restcountries.com/v3.1/name/${query}`),
    });

    this.allies = new Field<Country[], Country>({
      label: "Allies",
      validation: {
        required: { value: true }
      },
      optionId: country => country.cca3,
      optionLabel: country => country.name.common,
      optionsGroupProvider: country => `${country.name.common[0]} - list`,
      options: this.loadAllCountries(),
      value: [],
      onValueChange: allies => {
        console.error(`Selected allies: ${allies.map(country => country.name.common).join(", ")}`);
      },
    });

    this.anthem = new Field({
      label: "Anthem",
      validation: {
        required: { value: true },
      },
    });

    this.isOfficial = new Field({
      label: "Is official",
      validation: {
        requiredTrue: { value: true, text: "Please check this box" },
      },
    });

    let numbers = Array.from({ length: 15_000 }).map((_, index) => new Option<number, number>({
      id: index + 1,
      label: `Option ${index + 1}`,
      name: `Option ${index + 1}`,
      value: index + 1,
    }));

    this.customOptions = new Field<number[], Option<number, number>>({
      label: "Option",
      value: [numbers[0].value],
      options: of(numbers).pipe(delay(2000)),
      onValueChange: options => {
        console.error(`Selected options: ${options.join(", ")}`);
      },
    });

    super.initialize();
  }

  public reloadControls() {
    if (this.image.value?.length > 0) {
      let formData = new FormData().fromObject({
        file: this.image.value[0],
        files: this.image.value,
        ticket: {
          country: this.country.value,
        },
        allies: this.allies.value,
      });
    }

    this.dayOfBirth.options = [...this.dayOfBirth.options];

    this.country.setOptions(this.loadAllCountries());
    this.allies.setOptions(this.loadAllCountries());
  }

  private loadAllCountries() {
    return this.api.get<Country[]>(`https://restcountries.com/v3.1/all`).pipe(map(countries => countries.orderBy(x => x.name.common)));
  }
}
