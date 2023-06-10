const path = require('path');
const Excel = require('exceljs');
const { includes, indexOf, filter, some, slice, find, values, forEach } = require('lodash');
const moment = require('moment');

var workbook = new Excel.Workbook;
var flag;
var headerInd;
var inProgress = true;
var listAccountNumbers = ['Số Tài khoản:', 'Số tài khoản/ Account No.:', 'Số tài khoản/Account number', 'Số tài khoản:', 'Tài khoản giao dịch', 'Tài khoản giao dịch:', 'Số tài khoản/ Account number:', 'Số tài khoản ngân hàng (*)'];
var keywords = ['Ngày GD','Ngày giao dịch', 'Ngày thực hiện', 'Ngày/Value date', 'Ngày giao dịch/ Transaction date', 'Ngày hiệu lực', 'Ngày giao dịch(*)', 'Ngay Hach toan', 'Ngày', 'Ngày giá trị', 'NGÀY HẠCH TOÁN'];
var accountNumbers;
var bankName;
var result = [];

const getRichTextValue = value => {
    if(Object.keys(value || {})[0] === 'richText'){
        return value.richText[0].text
    }
    return value
}

const checkNextRow = row => {
    let keywordsDescription = ['Tổng số', 'Tổng cộng / Total', 'Cộng phát sinh trong kỳ', 'Cộng phát sinh', 'Tổng số tiền'];
    if(filter(row, elm => moment(getRichTextValue(elm),'DD/MM/YYYY').isValid()).length < 1){
        inProgress = false;
    };
    find(row, item => {
        includes(keywordsDescription, getRichTextValue(item)) ? inProgress = false : null;
    })
};

const findTimeIndex = row => {
    let index = 0;
    some(row.values, item => {
        (row._number === 6 ? (row.values.flatMap(elm => Object.values(elm).flatMap(item => item)))[1]?.text === 'Ngày giờ giao dịch\nTransaction Date Time' : null) ? index = 2 :
        (row._number === 8 ? (row.values.flatMap(elm => Object.values(elm).flatMap(item => item)))[0]?.text === "Ngày giao" : null) ? index = 1 :
        (row._number === 12 ? (row.values.flatMap(elm => Object.values(elm).flatMap(item => item)))[0]?.text === "Ngày hiệu lực" : null) ? index = 3 :
        (row._number === 14 ? getRichTextValue(row.values[3]) === 'Ngày hiệu lực' : null) ? index = 3 : 
        includes(keywords, item) ? index = indexOf(row.values, item)
         : null;
    })
    return index;
};

const findDescriptionIndex = row => {
    let descriptionKeyword = ['Diễn giải/Description', 'Mô tả giao dịch/ Transaction description', 'Nội dung', 'Mô tả', 'Diễn giải', 'Mô tả giao dịch', 'Nội dung (*)', 'Dien Giai', 'Nội dung giao dịch'];
    let index;
        find(row.values, item => {
            row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[28]?.text === 'Nội dung' ? index = 10
            : row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[6]?.text === 'Diễn giải\nDescription' ? index = 7
            : row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[5]?.text === 'Mô tả' ? index = 7
            : includes(getRichTextValue(row.values[7]), 'Nội dung chi tiết/') ? index = 7
            : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
        })
    return index;
};

const findReferenceNumberIndex = row => {
    let descriptionKeyword = ['Số giao dịch', 'Số bút toán/Reference number', 'Số tham chiếu', 'Số giao dịch/ Transaction number', 'Mã giao dịch', 'Số bút toán'];
    let index;
        find(row.values, item => {
            row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[20]?.text === 'Số bút toán' ? index = 7 
            : row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[9]?.text === '/\nTNX Date/ Số CT/ Doc No' ? index = 2 
            : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
        })
    return index;
};

const findCreditAmountIndex = row => {
    let descriptionKeyword = ['Số tiền rút', 'Có/Credit', 'Có / Credit', 'Số tiền ghi có', 'Ghi có', 'Ghi có (*)', 'So Tien Giao dich'];
    let index;
    find(row.values, item => {
        row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[4]?.text === 'Phát sinh có\nCredit Amount' ? index = 5 
        : row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[26]?.text === 'Phát sinh có' ? index = 9
        : row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[3]?.text === 'Ghi có' ? index = 5
        : includes(getRichTextValue(row.values[5]), 'Số tiền ghi có/') ? index = 5

        : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
    })
return index;
};

const findDebitAmountIndex = row => {
    let descriptionKeyword = ['Số tiền gửi', 'Nợ/Debit', 'Nợ/ Debit', 'Số tiền ghi nợ', 'Ghi nợ', 'Ghi nợ (*)', 'So Tien Giao dich'];
    let index;
    find(row.values, item => {
        row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[3]?.text === 'Phát sinh nợ\nDebit Amount' ? index = 4 
        : row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[24]?.text === 'Phát sinh nợ' ? index = 8
        : row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[2]?.text === 'Ghi nợ' ? index = 4
        : includes(getRichTextValue(row.values[4]), 'Số tiền ghi nợ/') ? index = 4
        : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
    })
return index;
};

const findReceiverAccountIndex = row =>{
    let descriptionKeyword = [`Tài khoản đích/Remitter's account number`, 'Số tài khoản đối ứng/ Corresponsive account', 'Tài khoản đối ứng'];
    let index;
    find(row.values, item => {
        row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[20]?.text === 'Số bút toán' ? index = 14
        : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
    })
return index;
}

const findReceiverNameIndex = row => {
    let descriptionKeyword = ['Tên tài khoản đối ứng/ Corresponsive name', 'Tên tài khoản', 'Đơn vị thụ hưởng'];
    let index;
    find(row.values, item =>{
        row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[30]?.text === 'Đơn vị thụ hưởng/Đơn vị chuyển' ? index = 13 
        : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
    })
    return index;
}

const getAccountNumber = row => {
    if(!accountNumbers){
        some(row.values, item => {
            (row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[0]?.text === 'Số tài khoản/') ? accountNumbers = row.values[2] 
        : row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[2]?.text === 'Số tài khoản' ? accountNumbers = row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[3]?.text
        : includes(row.values[1], 'BẢNG SAO KÊ GIAO DỊCH - Tài khoản số: ') ? accountNumbers = slice(row.values[1],38).join('')
        : includes(row.values[3], 'Số tài khoản: ') ? accountNumbers = slice(row.values[3],14).join('')
        : includes(row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[1]?.text, 'Số tài khoản:') ? accountNumbers = row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[1]?.text.match(/\d+/g)[0]
        : includes(row.values[1], 'Tai Khoan:') ? accountNumbers = slice(row.values[1],11,24).join('')
        : row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[37]?.text === '/Account No: ' ? accountNumbers = row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[38]?.text
        : row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[2]?.text === 'Số tài khoản / Account No.:' ? typeof row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[3] === 'object' ? accountNumbers =row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[3]?.text: accountNumbers = slice(row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item)), 3,18).join('').match(/\d+/)[0]
        // : (slice(row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item)), 0, 26).join('') === 'Số tài khoản/ Account No.:') ? accountNumbers = slice(row.values.flatMap(elm => Object.values(elm).flatMap(item => item)), 26).join('')
        : includes(listAccountNumbers, item) ? accountNumbers = (`${row.values[indexOf(row.values, item) + 1]}` === `${row.values[indexOf(row.values, item)]}` ? row.values[indexOf(row.values, item) + 2] : `${row.values[indexOf(row.values, item) + 1]}`)
        : null
        })
    }
    return accountNumbers;
};

const getBankName = row => {
    if(!bankName){
        if(row.values[1] === 'NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM'){
            bankName = 'NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM (VIETTINBANK)'
        } else if(row.values[1] === 'VIETNAM TECHNOLOGICAL AND COMMERCIAL JSC BANK'){
            bankName = 'NGÂN HÀNG TMCP KỸ THƯƠNG VIỆT NAM (TechComBank)'
        } else if(getRichTextValue(row.values[12]) === 'NGÂN HÀNG TMCP QUÂN ĐỘI'){
            bankName = 'NGÂN HÀNG TMCP QUÂN ĐỘI (MB bank)'
        } else if(getRichTextValue(row.values[3]) === 'NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM'){
            bankName = 'NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM (BIDV)'
        }
    }
    return bankName;
};

const getTransactionBankIndex = row => {
    let index;
    if(row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[40]?.text === 'Ngân hàng đối tác'){
        index = 16
    } else if (row.number === 5 && includes(row.values, 'Ngân hàng đối tác')){
        index = 8
    }
    return index;
};

const findBankAccountIndex = row =>{
    let descriptionKeyword = ['Số tài khoản ngân hàng (*)'];
    let index;
    find(row.values, item => {
        row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[20]?.text === 'Số bút toán' ? index = 14
        : includes(descriptionKeyword, item) ? index = indexOf(row.values, item) : null;
    })
return index;
}


const getAmount = value => {
    if(typeof value === 'string'){
        return parseFloat(value.replace(/[.,]/g, ''));
    } else if(typeof value === 'object'){
        if(typeof getRichTextValue(value) === 'string'){
            return parseFloat(getRichTextValue(value).replace(/[.,]/g, ''));
        } else if (typeof getRichTextValue(value) === 'number'){
            return getRichTextValue(value);
        }
    }
    return getRichTextValue(value);
};

const checkCreditAmount = (amount, worksheet) => {
    if(amount[findCreditAmountIndex(worksheet.getRow(headerInd))-1] === '+'){
        return 0;
    }
    return getAmount(amount[findCreditAmountIndex(worksheet.getRow(headerInd))])
}

 const checkDebitAmount = (amount, worksheet) => {
    if(amount[findDebitAmountIndex(worksheet.getRow(headerInd))-1] === '-'){
        return 0;
    }
    return getAmount(amount[findDebitAmountIndex(worksheet.getRow(headerInd))])
 }

// workbook.xlsx.readFile(path.resolve(__dirname, 'roc.xlsx')).then(function() {
//         var worksheet = workbook.getWorksheet(1);
//         worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
//         if(some(row.values, item => includes(keywords, item))
//          || (rowNumber === 6 ? (row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item)))[1]?.text === 'Ngày giờ giao dịch\nTransaction Date Time' : null)
//          || (rowNumber === 8 ? (row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item)))[0]?.text === "Ngày giao" : null)
//          || (rowNumber === 12 ? (row.values.flatMap(elm => Object.values(elm).flatMap(item => item)))[0]?.text === "Ngày hiệu lực" : null)
//          || (rowNumber === 14 ? getRichTextValue(row.values[3]) === 'Ngày hiệu lực' : null)
//          ){
//             flag = rowNumber;
//             headerInd = rowNumber;
//             // console.log('xxx', `${worksheet.getRow(rowNumber + 1).values[findRowIndex(row)]}`);
//             // console.log(moment(moment(worksheet.getRow(rowNumber + 1).values[findRowIndex(row)]).format('DD/MM/YYYY'),'DD/MM/YYYY').isValid());
//             if(!(moment(moment(`${getRichTextValue(worksheet.getRow(rowNumber + 1).values[findTimeIndex(row)])}`).format('DD/MM/YYYY'),'DD/MM/YYYY').isValid()
//             || moment(`${getRichTextValue(worksheet.getRow(rowNumber + 1).values[findTimeIndex(row)])}`, 'DD/MM/YYYY').isValid())){
//                 flag = rowNumber + 1;
//             }
//         }
//         // // => Debug here:
//         if(rowNumber === 3) {
//             console.log(row.values)
//             console.log('xxxx', row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[2]?.text);
//             // console.log('xxxxx', row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[40]?.text === 'Ngân hàng đối tác');
//             // checkNextRow(worksheet.getRow(rowNumber + 1).values);
//             // console.log('Row :' + rowNumber + ' ' + `${Object.values(row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[7])}` === 'Ngày');
//             // console.log(includes(getRichTextValue(row.values[4]), 'Số tiền ghi nợ/'))
//             // console.log('xxxx',row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[3]);
//             // console.log('===', row.values.flatMap(elm => Object.values(elm).flatMap(item => item))[7]?.text);
//             // console.log('Row ' + rowNumber + ' = ' + includes(row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[1]?.text, 'Số tài khoản:'));
//             // console.log(row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[1]?.text.match(/\d+/g)[0]);
//             // console.log('xxx',row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[9].text === '/\nTNX Date/ Số CT/ Doc No');
//             // console.log(includes(getRichTextValue(row.values[4]), 'Số tiền ghi nợ/'));
//             // checkNextRow(worksheet.getRow(rowNumber + 1).values);
//             // console.log('xxx', row.values.flatMap(elm => Object.values(elm || {}).flatMap(item => item))[30]);
//             // console.log(getBankName(row));
//             // console.log('x', );
//             // some(row.values, item => {
//             // includes(listAccountNumbers, item) ? console.log('xxx', row.values[indexOf(row.values, item) + 1]) : null
//             // })
//             // console.log('xx', moment('01-12-2022 14:52:42', 'DD/MM/YYYY', true).isValid());
//         }
//         getAccountNumber(row);
//         getBankName(row);
//         if(rowNumber > flag && worksheet.getRow(rowNumber).hasValues && inProgress){
//             checkNextRow(worksheet.getRow(rowNumber + 1).values);
//             // console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
//             result.push(row.values);
//         }
//         })

//         // console.log(result.map((item, ind) => {
//         //     return {
//         //         index: ind + 1,
//         //         bankAccount: accountNumbers.match(/\d+/)[0],
//         //         bankName: bankName || null,
//         //         descriptions: getRichTextValue(item[findDescriptionIndex(worksheet.getRow(headerInd))]) || '',
//         //         transactionsDate: moment(getRichTextValue(item[findTimeIndex(worksheet.getRow(headerInd))]), 'DD/MM/YYYY').valueOf(),
//         //         transactionBank: getRichTextValue(item[getTransactionBankIndex(worksheet.getRow(headerInd))]) || '',
//         //         referenceNumber: getRichTextValue(item[findReferenceNumberIndex(worksheet.getRow(headerInd))]) || '',
//         //         creditAmount: checkCreditAmount(item, worksheet) || 0,
//         //         objectCredit: {
//         //             account: item[findCreditAmountIndex(worksheet.getRow(headerInd))] ? getRichTextValue(item[findReceiverAccountIndex(worksheet.getRow(headerInd))]) || null  : null,
//         //             name: item[findCreditAmountIndex(worksheet.getRow(headerInd))] ? getRichTextValue(item[findReceiverNameIndex(worksheet.getRow(headerInd))]) || null  : null,
//         //         },
//         //         debitAmount: checkDebitAmount(item, worksheet) || 0,
//         //         objectDebit: {
//         //             account: item[findDebitAmountIndex(worksheet.getRow(headerInd))] ? getRichTextValue(item[findReceiverAccountIndex(worksheet.getRow(headerInd))]) || null : null,
//         //             name: item[findDebitAmountIndex(worksheet.getRow(headerInd))] ? getRichTextValue(item[findReceiverNameIndex(worksheet.getRow(headerInd))]) || null  : null,
//         //         },
//         //     }
//         // }))
//     });

    const pdfData = {
        "account_number": "14510000121748",
        "data": [
            [
                "STT (No) ",
                "Ngay giao dich (Trans.Date) ",
                "Ma giao dich (Trans.Code) ",
                "Phat sinh no (Debit amount) ",
                "Phat sinh co (Credit amount) ",
                "so du (Balance) ",
                "So chung tu SEQ No. ",
                "Ma GDV Teller ID ",
                "Ma CN Branch ",
                "Dien giai (Txn. Description) "
            ],
            [
                "so c (Ope ",
                "lu dau ky ening balance ",
                "",
                "",
                "",
                "0.00 ",
                "",
                "",
                "",
                ""
            ],
            [
                "1 ",
                "16/02/2022 18:13:32 ",
                "1491 ",
                "0.00 ",
                "1,068,000.00 ",
                "1,068,000.00 ",
                "20733638 ",
                "990CTLN H4 ",
                "145 ",
                "REM TKThe879768,tai ACB.NOP TIEN-160222- 18:14:33860594 CTLNHIDI000001878386374- 11-CRE-002 "
            ],
            [
                "2 ",
                "25/02/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "59.00 ",
                "1,068,059.00 ",
                "306 ",
                "DD4400 ",
                "145 ",
                "BIDV Tra Jai KKH "
            ],
            [
                "3 ",
                "24/03/2022 15:50:21 ",
                "1491 ",
                "0.00 ",
                "12,000,000.00 ",
                "13,068,059.00 ",
                "49140613 ",
                "990CTLN H4 ",
                "145 ",
                "REM TKThe879768,tai ACB.NOPTIEN-240322- 15:50:50493299 CTLNHIDI000002017269771- 11-CRE-002 "
            ],
            [
                "4 ",
                "25/03/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "295.00 ",
                "13,068,354.00 ",
                "1309 ",
                "DD4400 ",
                "145 ",
                "BIDV Tralai KKH "
            ],
            [
                "5 ",
                "29/03/2022 17:06:58 ",
                "0812 ",
                "110,000.00 ",
                "0.00 ",
                "12,958,354.00 ",
                "137582833 ",
                "TPTDBSM S ",
                "145 ",
                "REM PHIDICHVUNHAN TINTUDONG (BSMS)THANG 2.2022.MAKH16893459 "
            ],
            [
                "6 ",
                "04/04/2022 09:10:49 ",
                "1321 ",
                "0.00 ",
                "3,000,000,000.00 ",
                "3,012,958,354.00 ",
                "16 ",
                "3103106 1 ",
                "145 ",
                "REM Tfr Ac: 31010001893804 P31066 CAU PHA-XNCT 9 THANHTOANTIENTHLCONG "
            ],
            [
                "7 ",
                "04/04/2022 10:48:03 ",
                "1344 ",
                "3,000,000,000.00 ",
                "0.00 ",
                "12,958,354.00 ",
                "10 ",
                "1452100 7 ",
                "145 ",
                "REM NGUYEN THANH DIEN 082083000236 RUT SEC "
            ],
            [
                "8 ",
                "04/04/2022 15:54:51 ",
                "1427 ",
                "11,200,000.00 ",
                "0.00 ",
                "1,758,354.00 ",
                "2214659 ",
                "990BIC ",
                "145 ",
                "REM Tfr Ac: 14710000189768 NOP PHLBAO HIEMTALBIDV 30 THANG 4 SO GCNBH 48220000058 BANCAS SAN PHAM BICBAO AN DOANH NGHIEPTHOLHANBAOHIEM TU NGAY 04042022 DEN NGAY 03042023 "
            ],
            [
                "9 ",
                "08/04/2022 18:10:42 ",
                "0800 ",
                "55,000.00 ",
                "0.00 ",
                "1,703,354.00 ",
                "219 ",
                "1451101 2 ",
                "145 ",
                "REM THUPHIBAN SEC 50 TO TU GL958061 DEN GL 958110 "
            ],
            [
                "10 ",
                "25/04/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "847.00 ",
                "1,704,201.00 ",
                "136 ",
                "DD4400 ",
                "145 ",
                "BIDV Tra Iai KKH "
            ],
            [
                "11 ",
                "04/05/2022 18:05:16 ",
                "0812 ",
                "110,000.00 ",
                "0.00 ",
                "1,594,201.00 ",
                "137724391 ",
                "TPTDBSM S ",
                "145 ",
                "REM PHIDICH VU NHAN TIN TUDONG (BSMS) THANG 3.2022.MAKH16893459 "
            ],
            [
                "12 ",
                "11/05/2022 09:08:31 ",
                "0800 ",
                "33,000.00 ",
                "0.00 ",
                "1,561,201.00 ",
                "5 ",
                "1195103 3 ",
                "145 ",
                "REM THU PHIIN SAO KE TK "
            ],
            [
                "13 ",
                "25/05/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "264.00 ",
                "1,561,465.00 ",
                "349 ",
                "DD4400 ",
                "145 ",
                "BIDV Tra Iai KKH "
            ],
            [
                "14 ",
                "26/05/2022 09:13:43 ",
                "1321 ",
                "0.00 ",
                "600,000,000.00 ",
                "601,561,465.00 ",
                "23 ",
                "3103106 1 ",
                "145 ",
                "REM Tfr Ac: 31010001893804 P31066 CAU PHA -XNCT9 TT TIEN THLCONG "
            ],
            [
                "15 ",
                "26/05/2022 10:03:16 ",
                "0812 ",
                "110,000.00 ",
                "0.00 ",
                "601,451,465.00 ",
                "137867653 ",
                "TPTDBSM S ",
                "145 ",
                "REM PHIDICH VU NHAN TIN TUDONG (BSMS) THANG 4.2022.MAKH16893459 "
            ],
            [
                "16 ",
                "26/05/2022 10:19:15 ",
                "1344 ",
                "600,000,000.00 ",
                "0.00 ",
                "1,451,465.00 ",
                "27 ",
                "1452101 0 ",
                "145 ",
                "REM PHAN THI KIM THUY 079173024176 RUT SEC "
            ],
            [
                "17 ",
                "07/06/2022 08:35:38 ",
                "1321 ",
                "0.00 ",
                "500.000.000.00 ",
                "501,451,465.00 ",
                "17 ",
                "3106304 5 ",
                "145 ",
                "REM Tfr Ac: 31010001893804 CTCP CONG TRINH CAU PHA TPHCM XN CT9 TT TIEN THI CONG "
            ],
            [
                "18 ",
                "07/06/202 09:04:30 ",
                "1344 ",
                "500,000,000.00 ",
                "0.00 ",
                "1,451,465.00 ",
                "23 ",
                "1452101 0 ",
                "145 ",
                "REM PHAN THI KIM THUY 079173024176 RUT SFC "
            ],
            [
                "19 ",
                "07/06/2022 09:23:15 ",
                "1321 ",
                "0.00 ",
                "524.566.000.00 ",
                "526.017.465.00 ",
                "20 ",
                "3109905 4 ",
                "145 ",
                "REM Tfr Ac: 31010001893804 CTY CP CONG TRINH CAU PHA TPHCMXNCT9 TTTTH CONG "
            ],
            [
                "20 ",
                "07/06/2022 09:56:42 ",
                "1344 ",
                "524,566,000.00 ",
                "0.00 ",
                "1,451,465.00 ",
                "34 ",
                "1452101 0 ",
                "145 ",
                "REM PHAN THI KIM THUY 079173024176 RUT SEC "
            ],
            [
                "21 ",
                "08/06/2022 09:57:07 ",
                "1321 ",
                "0.00 ",
                "600,000,000.00 ",
                "601,451,465.00 ",
                "35 ",
                "3109905 4 ",
                "145 ",
                "REM Tfr Ac: 31010001893804 XN CT9 TTT THI CONG "
            ],
            [
                "22 ",
                "08/06/2022 10:21:35 ",
                "1344 ",
                "600,000,000.00 ",
                "0.00 ",
                "1,451,465.00 ",
                "18 ",
                "1452101 0 ",
                "145 ",
                "REM PHAN THI KIM THUY 079173024176 RUT SEC "
            ],
            [
                "23 ",
                "08/06/2022 10:49:51 ",
                "1321 ",
                "0.00 ",
                "600,000,000.00 ",
                "601,451,465.00 ",
                "34 ",
                "3103106 1 ",
                "145 ",
                "REM TfrAc: 31010001893804 P31066 CAU PHA -XNCT 9 THANH TOAN TIEN THLCONG "
            ],
            [
                "24 ",
                "08/06/2022 11:09:55 ",
                "1344 ",
                "600,000,000.00 ",
                "0.00 ",
                "1,451,465.00 ",
                "23 ",
                "1452101 0 ",
                "145 ",
                "REM PHAN THI KIM THUY 079173024176 RUT SEC "
            ],
            [
                "25 ",
                "25/06/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "247.00 ",
                "1,451,712.00 ",
                "963 ",
                "DD4400 ",
                "145 ",
                "BIDV Tralai KKH "
            ],
            [
                "26 ",
                "25/07/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "239.00 ",
                "1,451,951.00 ",
                "366 ",
                "DD4400 ",
                "145 ",
                "BIDV Tralai KKH "
            ],
            [
                "27 ",
                "25/08/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "247.00 ",
                "1,452,198.00 ",
                "3844 ",
                "DD4400 ",
                "145 ",
                "BIDV TraIai KKH "
            ],
            [
                "28 ",
                "22/09/2022 10:13:58 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "1,342,198.00 ",
                "260122042 ",
                "990TPBS MS ",
                "145 ",
                "REM PHIBSMS T05.2022 MA KH16893459. "
            ],
            [
                "29 ",
                "22/09/2022 11:31:11 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "1,232,198.00 ",
                "260379650 ",
                "990TPBS MS ",
                "145 ",
                "REM PHIBSMS T06.2022 MA KH16893459. "
            ],
            [
                "30 ",
                "22/09/2022 15:38:14 ",
                "0824 ",
                "55,000.00 ",
                "0.00 ",
                "1,177,198.00 ",
                "260641878 ",
                "990TPBS MS ",
                "145 ",
                "REM PHIBSMS T07.2022 MA KH16893459. "
            ],
            [
                "31 ",
                "22/09/2022 17:20:57 ",
                "0824 ",
                "55,000.00 ",
                "0.00 ",
                "1,122,198.00 ",
                "260907651 ",
                "990TPBS MS ",
                "145 ",
                "REM PHIBSMS T08.2022 MA KH16893459. "
            ],
            [
                "32 ",
                "25/09/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "239.00 ",
                "1,122,437.00 ",
                "1835 ",
                "DD4400 ",
                "145 ",
                "BIDV Tralai KKH "
            ],
            [
                "33 ",
                "26/09/2022 14:06:19 ",
                "0824 ",
                "22,000.00 ",
                "0.00 ",
                "1,100,437.00 ",
                "261210529 ",
                "990QLTK DN ",
                "145 ",
                "REM PHIQUANLYTAI KHOAN 145xxx1748 Q1 2022 "
            ],
            [
                "34 ",
                "26/09/2022 15:56:06 ",
                "0824 ",
                "66,000.00 ",
                "0.00 ",
                "1,034,437.00 ",
                "261492900 ",
                "990QLTK DN ",
                "145 ",
                "REM PHIQUANLYTAI KHOAN 145xxx1748 Q2 2022 "
            ],
            [
                "35 ",
                "27/09/2022 08:29:05 ",
                "0824 ",
                "34,437.00 ",
                "0.00 ",
                "1,000,000.00 ",
                "261853855 ",
                "990QLTK DN ",
                "145 ",
                "REM PHIQUANLYTAI KHOAN 145xxx1748 Q3 2022 "
            ],
            [
                "36 ",
                "27/09/2022 09:12:15 ",
                "0824 ",
                "31,563.00 ",
                "0.00 ",
                "968,437.00 ",
                "262114643 ",
                "990QLTK DN ",
                "145 ",
                "REM PHIQUANLYTAI KHOAN 145xxx1748 Q3 2022 "
            ],
            [
                "37 ",
                "24/10/2022 16:41:54 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "858,437.00 ",
                "280536579 ",
                "990TPBS MS ",
                "145 ",
                "REM PHI BSMS T09.2022 MA KH16893459. "
            ],
            [
                "38 ",
                "25/10/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "158.00 ",
                "858,595.00 ",
                "1527 ",
                "DD4400 ",
                "145 ",
                "BIDV Tralai KKH "
            ],
            [
                "39 ",
                "25/11/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "146.00 ",
                "858,741.00 ",
                "1504 ",
                "DD4400 ",
                "145 ",
                "BIDV Tra Jai KKH "
            ],
            [
                "40 ",
                "29/11/2022 10:25:36 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "748,741.00 ",
                "298900478 ",
                "990TPBS MS ",
                "145 ",
                "REM PHI BSMS T10.2022 MA KH16893459. "
            ],
            [
                "41 ",
                "12/12/2022 16:13:16 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "638,741.00 ",
                "306978029 ",
                "990TPBS MS ",
                "145 ",
                "REM PHLBSMS T11.2022 MA KH16893459. "
            ],
            [
                "42 ",
                "15/12/2022 10:27:38 ",
                "0824 ",
                "66,000.00 ",
                "0.00 ",
                "572,741.00 ",
                "315940573 ",
                "990QLTK DN ",
                "145 ",
                "REM PHI QUAN LY TAI KHOAN 145xxx1748 Q4 2022 "
            ],
            [
                "43 ",
                "21/12/2022 10:31:38 ",
                "0824 ",
                "110,000.00 ",
                "0.00 ",
                "462,741.00 ",
                "330950087 ",
                "990TPBS MS ",
                "145 ",
                "REM PHIBSMS T12.2022 MA KH16893459. "
            ],
            [
                "44 ",
                "25/12/2022 23:59:59 ",
                "160 ",
                "0.00 ",
                "109.00 ",
                "462,850.00 ",
                "162 ",
                "DD4400 ",
                "145 ",
                "BIDV Tra lai KKH "
            ],
            [
                "con (Tot ",
                "g phat sinh al Amount) ",
                "",
                "5,837,174,000.00 ",
                "5,837,636,850.00 ",
                "",
                "",
                "",
                "",
                ""
            ],
            [
                "so c (Clo ",
                "lu cuoi ky ing balance) ",
                "",
                "",
                "",
                "462,850.00 ",
                "",
                "",
                "",
                ""
            ]
        ]
    }

    const readTransactionFromPDF = input => {
        let flag = false;
        let pushing = false;
        let titleIndex = null;

        const timeKeys = ['Ngay giao dich (Trans.Date)'];
        const referenceNumberKeys = ['Ma giao dich (Trans.Code)'];
        const debitKeys = ['Phat sinh no (Debit amount)'];
        const creditKeys = ['Phat sinh co (Credit amount)'];
        const descriptionKeys = ['Dien giai (Txn. Description)'];

        const bankAccount = input.account_number;
        const data = input.data.map(row => row.map(cell => cell.trim()));
        
        const result = [];

        const getIndex = (row, keys) =>{
            let index = null;
            for (const [idx, element] of row.entries()){
                if(includes(keys, element)){
                    index = idx;
                    break;
                }
            };
            return index;
        }

        for (const [index, row] of data.entries()){
            // result.push(row);
            if(includes(row, ))
        }

        console.log(result.map((item, index) => {
            return {
                index: index +1,
                bankAccount,
                transactionDate: item[getIndex(data[0], timeKeys)],
                description: item[getIndex(data[0], descriptionKeys)],
                debitAmount: item[getIndex(data[0], debitKeys)],
                creditAmount: item[getIndex(data[0], creditKeys)],
            }
        }))
        
    }

    readTransactionFromPDF(pdfData);
