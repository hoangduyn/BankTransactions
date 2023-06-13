const path = require('path');
const Excel = require('exceljs');
const { includes, indexOf, filter, some, slice, find, values, forEach, isNil } = require('lodash');
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
        "account_number": "0107247754",
        "data": [
            [
                "STT/No ",
                "Ngay/Date ",
                "So GDI Transaction number ",
                "Noi Dung/Content ",
                "Ps giam(No)/ Debit ",
                "Ps tang(Co)/ Credit ",
                "so dwl Balance "
            ],
            [
                "1 ",
                "06/03/2023 ",
                "FT2306573JF8 ",
                "THUPHIDINH KY DICH VU SMS KHDN THANG 3 NAM 2023 ",
                "27,500 ",
                "",
                "3,991,476 "
            ],
            [
                "2 ",
                "10/03/2023 ",
                "FT23069YFC99\\BNK ",
                "MBVCB.3206957277.040905 BUITHITHANHTHUY TRA TIENHANG.CTTU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHAKHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "490,000,000 ",
                "493,991,476 "
            ],
            [
                "3 ",
                "10/03/2023 ",
                "FT23069RKJJ9\\BNK ",
                "MBVCB.3206969386.043951 BUITHITHANH THUY TRA TIEN HANG.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVY NHA KHOA MINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "490,000,000 ",
                "983.991,476 "
            ],
            [
                "4 ",
                "10/03/2023 ",
                "FT23069KBYRPBNK ",
                "MBVCB.3206963845.048132 NGUYENVANMINH CHUYENTIEN.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHA KHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "490,000,000 ",
                "1,473,991,476 "
            ],
            [
                "STT/No ",
                "Ngay/Date ",
                "So GDI Transaction number ",
                "Noi Dung/Content ",
                "Ps giam(No)l Debit ",
                "Ps tang(Co)l Credit ",
                "So duI Balance "
            ],
            [
                "5 ",
                "10/03/2023 ",
                "FT23069YBBD9\\BNK ",
                "MBVCB.3206977372.051953 BUITHITHANH THUY TRA TIEN HANG.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDV Y NHA KHOA MINH PHUONG NGAN HANG PHUONG DONG (OCB) ",
                "0 ",
                "490,000,000 ",
                "1,963,991,476 "
            ],
            [
                "6 ",
                "10/03/2023 ",
                "FT23069F56N8\\BNK ",
                "MBVCB.3206980800.055865 BUITHITHANHTHUY TRA TIEN HANG.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVY NHA KHOA MINH PHUONG NGAN HANG PHUONG DONG (OCB) ",
                "0 ",
                "40,000 ,000 ",
                "2.00 "
            ],
            [
                "",
                "10/03/2023 ",
                "FT23069J41P6\\BNK ",
                "MBVCB.3207016142.072025 NGUYEN MINHSOWN TRA TIEN HANG.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHA KHOA MINHPHUONGNGAN HANG PHUONG DONG (OCB) ",
                "0 ",
                "",
                "2.08 "
            ],
            [
                "8 ",
                "10/03/2023 ",
                "T23069M8QNWBr K ",
                "OCB:0032100002839004:NG0 YENMINH SON TRA TIEN HANG ",
                "0 ",
                "490,000,000 ",
                ""
            ],
            [
                "",
                "10/03/2023 ",
                "FT230693NFGXBNK ",
                "CTTNHHTHUONGMA DICHVUYNHAKHOA MINH PHUONGCHUYEN TIEN ",
                "0 ",
                "800,000 ",
                ""
            ],
            [
                "10 ",
                "13/03/2023 ",
                "FT230/20CTK6\\BNK ",
                "NGUYEN MINH SON TRA TIEN HANG ",
                "0 ",
                "320,000,000 ",
                "3,693,991,476 "
            ],
            [
                "",
                "13/03/2023 ",
                "T23072JS1K2BNK ",
                "PHAM KIM OANH TRA TIEN HANG ",
                "0 ",
                "490,000,000 ",
                "4,183, "
            ],
            [
                "",
                "13/03/2023 ",
                "FT2307270H5ZBNK ",
                "PHAMKIMOANHTRA TIEN HAG ",
                "0 ",
                "199,640,000 ",
                "4,383,631,476 "
            ],
            [
                "13 ",
                "13/03/2023 ",
                "FT230/29LN2X\\BNK ",
                "NGUYEN TRI SON TRA TRA TIEN HANG ",
                "0 ",
                "206,724,000 ",
                "4,590,355,476 "
            ],
            [
                "14 ",
                "13/03/2023 ",
                "FT23072HX688\\BNK ",
                "NGUYEN MINHNGUYE TRA TIEN HANG ",
                "0 ",
                "320,000,000 ",
                "4,910,355,476 "
            ],
            [
                "",
                "13/03/2023 ",
                "FT23072WGZ7S\\BNK ",
                "CHTDUNGTRA TIENHANG ",
                "0 ",
                "496.795,000 ",
                "5.407. T30.476 "
            ],
            [
                "16 ",
                "13/03/2023 ",
                "FT230/2Y3YBHBNK ",
                "CHIDUNG TRA TIEN HANG ",
                "0 ",
                "",
                "5,517,150,476 "
            ],
            [
                "",
                "13/03/2023 ",
                "T23072YQLYG\\BN K ",
                "OUONGTHANHPHUONG TRA TIEN HAG ",
                "0 ",
                "120,000,000 ",
                "5,637, 150.476 "
            ],
            [
                "18 ",
                "13/03/2023 ",
                "FT23072GSWWWBN K ",
                "NGUYENVANSONTRA TIEN HANG ",
                "0 ",
                "96,600,000 ",
                "5,733,750,476 "
            ],
            [
                "19 ",
                "13/03/2023 ",
                "FT230/2S9HFSBNK ",
                "MAIPHUONGNOPTIEN VAO TK ",
                "0 ",
                "490,000,000 ",
                "6,223,750,476 "
            ],
            [
                "20 ",
                "13/03/2023 ",
                "FT230/20D0TN\\BNK ",
                "MAI PHUONG NOP TIEN VAO TK ",
                "0 ",
                "490,000,000 ",
                "6,713,750,476 "
            ],
            [
                "21 ",
                "13/03/2023 ",
                "FT230722TGX4BNK ",
                "MATPHUONGNOPTIEN VAO TK ",
                "0 ",
                "120,000,000 ",
                "6,833,750,476 "
            ],
            [
                "STT/No ",
                "NgaylDate ",
                "So GDl Transaction number ",
                "Noi Dung/Content ",
                "Ps giam(No)/ Debit ",
                "Ps tang(Co)/ Credit ",
                "So duI Balance "
            ],
            [
                "22 ",
                "13/03/2023 ",
                "FT230723H56Z\\BNK ",
                "MAI PHUONG NOP TIEN VAO TK ",
                "",
                "50,000,000 ",
                "6,883,750,476 "
            ],
            [
                "23 ",
                "13/03/2023 ",
                "FT230721SJSW\\BNK ",
                "MAIPHUONGNOP TIEN VAO TK ",
                "",
                "80,000,000 ",
                "6,963,750,476 "
            ],
            [
                "24 ",
                "13/03/2023 ",
                "FT23072GLKTB\\BNK ",
                "MBVCB.3221286133.098547 MAIPHUONGNOP TIEN VAO TK.CT TU 0711000232464NGUYEN VAN MINH TOI 0032100002839004 CTTNHH TMDVYNHAKHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "10,000,000 ",
                "6,973,750,476 "
            ],
            [
                "25 ",
                "13/03/2023 ",
                "FT23072NRFZY\\BNK ",
                "OCB:0032100002839004;MAI PHUONG NOPTIENVAO TK ",
                "",
                "40,000,000 ",
                "7,013,750,476 "
            ],
            [
                "26 ",
                "13/03/2023 ",
                "FT23072T2GPB\\BNK ",
                "MAI PHUONG NOP TIEN VAO TK ",
                "0 ",
                "40,000,000 ",
                "7,053,750,476 "
            ],
            [
                "27 ",
                "13/03/2023 ",
                "FT23072Z22SR\\BNK ",
                "MBVCB.3223331723.089289 MAIPHUONGNOP TIEN VAO TK.CT TU 0711000232464NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHA KHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "81,000,000 ",
                "7,134,750,476 "
            ],
            [
                "28 ",
                "14/03/2023 ",
                "LD2236000089 ",
                "THANHTOANLAITD ",
                "21,917,808 ",
                "0 ",
                "7,112,832,668 "
            ],
            [
                "29 ",
                "14/03/2023 ",
                "LD2236000089 ",
                "THANHTOANGOC TD ",
                "4,000,000,000 ",
                "0 ",
                "3,112,832,668 "
            ],
            [
                "30 ",
                "14/03/2023 ",
                "FT23073H2SQ7 ",
                "OCB PGDDONGDO GIAI NGANTHEO KUNN0032081.02/2023/KUN N/OCB/DN LD2307300264 KHCT TNHH TMDVYNHA KHOA MINH PHUONG NGAY 14/03/2023 ",
                "0 ",
                "8,500,000,000 ",
                "11,612,832,668 "
            ],
            [
                "31 ",
                "14/03/2023 ",
                "FX2307300124\\BNK ",
                "KHCTTNHHTMDVYNHA KHOAMINHPHUONGMUA SGD THANH TOAN 1O0 HOP DONGSO GC-875 (MINH) NGAY 04/01/2022 ",
                "11,572,981,450 ",
                "0 ",
                "39,851,218 "
            ],
            [
                "32 ",
                "14/03/2023 ",
                "FT23073QXWYN ",
                "PMTFOR1OOPCTOF SALES CNT NO.GC-875(MINH) DD 04JAN2022 ",
                "26,025,416 ",
                "0 ",
                "13,825,802 "
            ],
            [
                "33 ",
                "23/03/2023 ",
                "FT23082ZDWTM\\BN K ",
                "MBVCB.3270474180.022322 NGUYENVANMINH CHUYENTIEN.CT TU 0711000232464 NGUYEN VANMINHTOI 0032100002839004 CT TNHH TMDVYNHA KHOAMINH PHUONGNGANHANG PHUONGDONGOCB ",
                "0 ",
                "30,740,000 ",
                "44,565,802 "
            ],
            [
                "STT/No ",
                "Ngay/Date ",
                "So GDI Transaction number ",
                "Noi Dung/Content ",
                "Ps giam(No)/ Debit ",
                "Ps tang(Co)/ Credit ",
                "So duI Balance "
            ],
            [
                "34 ",
                "24/03/2023 ",
                "FT23083PJCL1\\BNK ",
                "MBVCB.3272982673.052067 NGUYENMAIPHUONGNOP TIENVAO TK.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVY NHA KHOA MINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "250,000,000 ",
                "294,565,802 "
            ],
            [
                "35 ",
                "24/03/2023 ",
                "FX2308300049\\BNK ",
                "CTTNHHTMDVYNHA KHOA MINH PHUONGMUA 10.500USD TG 23.600 CUA NH OCBDE THANH TOAN HANGNHAPKHAU ",
                "247,800,000 ",
                "0 ",
                "46,765,802 "
            ],
            [
                "36 ",
                "24/03/2023 ",
                "FT23083R2JD5 ",
                "ADV PMNT 100PCT OF CNTNO.12MP/2023DD 16/03/2023 ",
                "988,277 ",
                "0 ",
                "45,777,525 "
            ],
            [
                "37 ",
                "25/03/2023 ",
                "FT230845S1FD\\BNK ",
                "MBVCB.3278132468.022005 NGUYENVANMINH CHUYEN TIEN.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHAKHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "490,000,000 ",
                "535,777,525 "
            ],
            [
                "38 ",
                "25/03/2023 ",
                "FT23084WCQJ9\\BNK ",
                "MBVCB.3278136831.025168 NGUYENVANMINH CHUYEN TIEN.CT TU 0711000232464 NGUYEN VAN MINH TOI 0032100002839004 CT TNHH TMDVYNHA KHOAMINH PHUONGNGANHANG PHUONG DONG (OCB) ",
                "0 ",
                "10,000,000 ",
                "545,777,525 "
            ],
            [
                "39 ",
                "25/03/2023 ",
                "LD2307300264 ",
                "THANHTOANLAITD ",
                "30,739,726 ",
                "0 ",
                "515,037,799 "
            ],
            [
                "40 ",
                "25/03/2023 ",
                "0032100002839004-20 230326 ",
                "GHI COLAI TIEN GUI ",
                "0 ",
                "152,682 ",
                "515,190,481 "
            ],
            [
                "41 ",
                "27/03/2023 ",
                "FT230864GFPQ\\BNK ",
                "MAI PHUONG NOP TIEN VAO TK ",
                "0 ",
                "400,000,000 ",
                "915,190,481 "
            ],
            [
                "42 ",
                "27/03/2023 ",
                "FT23086PN6W6\\BNK ",
                "MAI PHUONG NOP TIEN VAO TK ",
                "0 ",
                "100,000,000 ",
                "1,015,190,481 "
            ],
            [
                "43 ",
                "27/03/2023 ",
                "LD2307300264 ",
                "GIAM NO GOC ",
                "1,000,000,000 ",
                "0 ",
                "15,190,481 "
            ],
            [
                "44 ",
                "29/03/2023 ",
                "FT230887ZBNZ\\BNK ",
                "MBVCB.3296099207.062130 NOP TIENVAO TK.CT TU 1022063873 NGUYEN MAI PHUONG TOI 0032100002839004 CT TNHH TMDVY NHA KHOA MINH PHUONG NGAN HANG PHUONGDONG(OCB) ",
                "0 ",
                "122.236.000 ",
                "137,426,481 "
            ],
            [
                "STT/No ",
                "NgayIDate ",
                "So GDI Transaction number ",
                "Noi Dung/Content ",
                "Ps giam(No)/ Debit ",
                "Ps tang(Co)/ Credit ",
                "So duI Balance "
            ],
            [
                "45 ",
                "29/03/2023 ",
                "FX2308800071\\BNK ",
                "CTTNHHTMDVYNHA KHOA MINHPHUONGMUA 5.145USD TG 23.600 CUA NH OCBDE THANH TOAN1O0 PHAN TRAM HOA DONCHIEU LE SO JJ2023030601 NGAY 28.0 ",
                "121,422,000 ",
                "0 ",
                "16,004,481 "
            ],
            [
                "46 ",
                "29/03/2023 ",
                "FT23088MKGM0 ",
                "ADVPAYMENT IOOPCTOF PROFORMAINVOICE NO.JJ2023030601 DD 28 MAR2023 ",
                "779,394 ",
                "0 ",
                "15,225,087 "
            ]
        ]
    }

    const readTransactionFromPDF = input => {
        let titleIndex = null;

        const timeKeys = ['Ngay giao dich (Trans.Date)', 'Ngay ', 'Ngay hieu luc', 'Ngay gia tri', 'Ngay gia tri Value Date', 'Ngay/Date'];
        const referenceNumberKeys = ['Ma giao dich (Trans.Code)', 'S6 GD ', 'S6CT', 'S6 giao djch', 'So but toan Trans.ID', 'So GDI Transaction number'];
        const debitKeys = ['Phat sinh no (Debit amount)', 'Ghi ng ', 'Phat sinh ng', 'No', 'Phat sinh No', `So tien ghi ng' Debit Amount`, 'Ps giam(No)/ Debit'];
        const creditKeys = ['Phat sinh co (Credit amount)', 'Ghi c6 ', 'Phat sinh co', 'C6', 'Phat sinh Co', 'So tien ghi co Credit Amount', 'Ps tang(Co)/ Credit'];
        const descriptionKeys = ['Dien giai (Txn. Description)', 'Dien giai', 'Noi dung', 'Noi dung giao dich Trans.Detail', 'Noi Dung/Content'];

        const bankAccount = input.account_number;
        const data = input.data.map(row => row.map(cell => cell.trim()));
        
        const result = [];

        // Lấy vị trí của key trên dòng title
        const getIndex = (row = [], keys) =>{
            let index = null;
            for (const [idx, element] of row.entries()){
                if(includes(keys, element.trim())){
                    index = idx;
                    break;
                }
            };
            return index;
        }

        // Kiểm tra row chứa ngày giờ
        const checkRowContainsMoment = row => {
            let status = false;
            for (const element of row){
                if(moment(element.trim(), 'DD/MM/YYYY').isValid() && !status){
                    status = true;
                }
            }
            return status;
        };

        // Tìm vị trí của hàng tiêu đề cột
        const detectTitleIndex = (row, index, keys) => {
            for (const element of row){
                if(includes(keys, element.trim())){
                    titleIndex = index;
                }
            };
        };

        for (const [index, row] of data.entries()){
            if(isNil(titleIndex)) detectTitleIndex(row, index, timeKeys);
            if(index > titleIndex && checkRowContainsMoment(row)){ // Row phải chứa moment string và không phải cột tiêu đề
                result.push(row);
            }
        };

        console.log(result.map((item, index) => {
            return {
                index: index +1,
                bankAccount,
                transactionDate: item[getIndex(data[titleIndex], timeKeys)],
                description: item[getIndex(data[titleIndex], descriptionKeys)],
                debitAmount: item[getIndex(data[titleIndex], debitKeys)] || 0,
                creditAmount: item[getIndex(data[titleIndex], creditKeys)] || 0,
                referenceNumber: item[getIndex(data[titleIndex], referenceNumberKeys)] || '',
            }
        }))

        // console.log('====', titleIndex);
        // console.log('date: ', moment(data[1][2],'DD/MM/YYYY').isValid())
        // console.log('x',data[1][2] );
        
    }

    readTransactionFromPDF(pdfData);
