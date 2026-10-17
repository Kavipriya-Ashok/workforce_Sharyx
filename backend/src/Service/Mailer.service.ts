import { Injectable, Logger } from '@nestjs/common';
import { email_config } from '@Database/Table/Admin/email_config';
import nodemailer from "nodemailer";
import { EncryptionService } from './Encryption.service';
import handlebars from "handlebars";
import path from "path";
import fs from 'fs';
import utils from 'util';
import { Attachment } from 'nodemailer/lib/mailer';
const readFile = utils.promisify(fs.readFile)

interface SendMailData {
  to: string,
  subject: string,
  template: string,
  context: {},
  html: boolean,
  bcc?: string[],
  attachments?: Attachment[] | undefined
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  constructor(
    private readonly _EncryptionService: EncryptionService
  ) {
  }

  private async Configuration() {
    const Email = await email_config.find();
    if (Email.length == 0) {
      this.logger.error("Email config don't have data");
      return null;
    }
    var smtpTransport = nodemailer.createTransport({
      host: Email[0].host,
      auth: {
        user: Email[0].email_id,
        pass: this._EncryptionService.Decrypt(Email[0].password)
      }
    });
    this.logger.error("Email configurated successfully");
    return { smtpTransport, Email };
  }

  async SendMail(_SendMailData: SendMailData) {
    try {
      const SmtpTransport = await this.Configuration();
      if (!SmtpTransport.smtpTransport) {
        this.logger.error("Email not configured yet.");
        return { status: false, message: "Email not configured yet." };
      }
      const mail = {
        from: { name: SmtpTransport.Email[0].mailer_name, address: SmtpTransport.Email[0].email_id },
        to: _SendMailData.to,
        subject: _SendMailData.subject,
        text: _SendMailData.template,
        bcc: _SendMailData.bcc,
        attachments: _SendMailData.attachments
      }
      if (_SendMailData.template && _SendMailData.html) {
        const MailTemplatePath = path.resolve(`dist/Assets/MailTemplate/${_SendMailData.template}.hbs`);
        const ContentResult = await readFile(MailTemplatePath, 'utf8');
        const Template = handlebars.compile(ContentResult, { strict: true });
        mail["html"] = Template(_SendMailData.context);
      }
      else {
        mail["text"] = _SendMailData.template;
      }
      let SendMailPromise = new Promise<{ status: boolean, message: string }>((resolve, _reject) => {
        SmtpTransport.smtpTransport.sendMail(mail, async (error: any, _response: any) => {
          if (error) {
            this.logger.error(error);
            SmtpTransport.smtpTransport.close();
            resolve({ status: false, message: JSON.stringify(error) });
          } else {
            SmtpTransport.smtpTransport.close();
            resolve({ status: true, message: 'Message has been sent' });
          }
        });
      });
      return await SendMailPromise;
    }
    catch (e) {
      return { status: false, message: e.message };
    }
  }
}
