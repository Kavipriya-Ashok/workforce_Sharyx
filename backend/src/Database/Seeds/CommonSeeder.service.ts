import { DataSource } from 'typeorm';
import { user_role } from '../Table/Admin/user_role';
import { user } from '../Table/Admin/user';
import { currency } from '../Table/Admin/currency';
import { country } from '../Table/Admin/country';
import { company } from '../Table/Admin/company';
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '@Service/Encryption.service';

@Injectable()
export class CommonSeederService {
  constructor(
    private readonly _EncryptionService: EncryptionService,
    private _DataSource: DataSource
  ) {
  }
  async Run() {
    try {
      await this.UserRoleSeed();
    }
    catch (e) {
      console.log(e);
    }

    try {
      await this.UserSeed();
    }
    catch (e) {
      console.log(e);
    }

    try {
      await this.CurrencySeed();
    }
    catch (e) {
      console.log(e);
    }

    try {
      await this.CountrySeed();
    }
    catch (e) {
      console.log(e);
    }

    try {
      await this.CompanySeed();
    }
    catch (e) {
      console.log(e);
    }

  }


  UserRoleSeed = async () => {
    await this._DataSource.manager.createQueryBuilder()
      .insert()
      .into(user_role)
      .values([
        { name: 'Super Admin', code: '', created_by_id: "0", created_on: new Date() }
      ])
      .execute()
  }

  UserSeed = async () => {
    const UserRoleData = await user_role.findOne({ where: { name: "Super Admin" } });
    await this._DataSource.manager.createQueryBuilder()
      .insert()
      .into(user)
      .values([
        {
          user_role_id: UserRoleData.id,
          email: 'admin@user.com',
          password: this._EncryptionService.Encrypt('Login123!!'),
          created_by_id: "0",
          created_on: new Date()
        }
      ])
      .execute()
  }

  CurrencySeed = async () => {
    await this._DataSource.manager.createQueryBuilder()
      .insert()
      .into(currency)
      .values([
        {
          name: 'Pound sterling',
          code: 'GBP',
          symbol: '£',
          created_by_id: "0",
          created_on: new Date()
        }
      ])
      .execute()
  }

  CountrySeed = async () => {
    const CurrencyData = await currency.findOne({ where: { name: "Pound sterling" } });
    await this._DataSource.manager.createQueryBuilder()
      .insert()
      .into(country)
      .values([
        {
          name: 'United Kingdom',
          code: 'UK',
          currency_id: CurrencyData.id,
          created_by_id: "0",
          created_on: new Date()
        }
      ])
      .execute()
  }

  CompanySeed = async () => {
    const CurrencyData = await currency.findOne({ where: { name: "Pound sterling" } });
    const CountryData = await country.findOne({ where: { name: "United Kingdom" } });
    await this._DataSource.manager.createQueryBuilder()
      .insert()
      .into(company)
      .values([
        {
          name: "BoilerPlate",
          address: "BoilerPlate",
          postal_code: "BoilerPlate",
          country_id: CountryData.id,
          currency_id: CurrencyData.id,
          email: "Demo",
          website: "Demo",
          invoice_footer: "BoilerPlate",
          created_by_id: "0",
          created_on: new Date()
        }
      ])
      .execute()
  }

}

