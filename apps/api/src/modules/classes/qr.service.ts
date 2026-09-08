import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';

@Injectable()
export class QrService {
  /** PNG 512px, mức sửa lỗi M — đủ rõ khi in A4 hoặc chiếu lên màn. */
  png(text: string): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }
}
