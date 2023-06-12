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
        "account_number": "607704060102224",
        "data": [
            [
                "S6CT ",
                "Ngay GD ",
                "Ngay hieu luc ",
                "Loai GD ",
                "So sec/so ref ",
                "Phat sinh ng ",
                "Phat sinh co ",
                "sodu ",
                "Noi dung "
            ],
            [
                "Seq.No. ",
                "Tran Date ",
                "Effect Date ",
                "Tran ",
                "Cheque No./ Reference ",
                "Withdrawal ",
                "Deposit ",
                "Balance ",
                "Remarks "
            ],
            [
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ],
            [
                "3760449786 ",
                "01/01/2022 ",
                "01/01/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "506,740 ",
                ""
            ],
            [
                "3767633795 ",
                "07/01/2022 ",
                "07/01/2022 ",
                "FTCR ",
                "60122000709 47 ",
                "0 ",
                "3,600.000 ",
                "4.106,740 ",
                "IBNOPTIEN "
            ],
            [
                "3769038128 ",
                "07/01/2022 ",
                "07/01/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "4,076,740 ",
                ""
            ],
            [
                "3769038129 ",
                "07/01/2022 ",
                "07/01/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "4,073,740 ",
                ""
            ],
            [
                "3772553465 ",
                "10/01/2022 ",
                "10/01/2022 ",
                "CLDR ",
                "0000981684 ",
                "3,524,356 ",
                "",
                "549.384 ",
                "THUNO TUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "3803413160 ",
                "31/01/2022 ",
                "31/01/2022 ",
                "CRIN ",
                "",
                "0 ",
                "75 ",
                "549,459 ",
                ""
            ],
            [
                "3811518283 ",
                "08/02/2022 ",
                "08/02/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "516,459 ",
                ""
            ],
            [
                "3812642225 ",
                "09/02/2022 ",
                "09/02/2022 ",
                "CLDR ",
                "0000981684 ",
                "16,459 ",
                "0 ",
                "500,000 ",
                "THUNO TUDONG HD0095/CTYTHIEN "
            ],
            [
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "PHUC "
            ],
            [
                "3816329264 ",
                "12/02/2022 ",
                "12/02/2022 ",
                "NBCR ",
                "",
                "0 ",
                "3,500,000 ",
                "4,000,000 ",
                "NOPTIEN-120222- 11:04:35512814 "
            ],
            [
                "3816599568 ",
                "12/02/2022 ",
                "12/02/2022 ",
                "CLDR ",
                "0000981684 ",
                "3,292,880 ",
                "0 ",
                "707,120 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "3817076676 ",
                "12/02/2022 ",
                "12/02/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "677,120 ",
                ""
            ],
            [
                "3817076677 ",
                "12/02/2022 ",
                "12/02/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "674,120 ",
                ""
            ],
            [
                "3837789634 ",
                "28/02/2022 ",
                "28/02/2022 ",
                "CRIN ",
                "",
                "0 ",
                "48 ",
                "674,168 ",
                ""
            ],
            [
                "3839644209 ",
                "01/03/2022 ",
                "01/03/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "641,168 ",
                ""
            ],
            [
                "3845713125 ",
                "05/03/2022 ",
                "05/03/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "611,168 ",
                ""
            ],
            [
                "3845713126 ",
                "05/03/2022 ",
                "05/03/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "608,168 ",
                ""
            ],
            [
                "3850175752 ",
                "09/03/2022 ",
                "09/03/2022 ",
                "FTCR ",
                "60122007862 96 ",
                "0 ",
                "13,100,000 ",
                "13.708.168 ",
                "IBNOPTIEN "
            ],
            [
                "3850526515 ",
                "09/03/2022 ",
                "09/03/2022 ",
                "CLDR ",
                "0000981684 ",
                "3,083,811 ",
                "0 ",
                "10,624,357 ",
                "THULAICTYTHIEN PHUC "
            ],
            [
                "3850540112 ",
                "09/03/2022 ",
                "09/03/2022 ",
                "CLDR ",
                "0000981684 ",
                "10,000,000 ",
                "0 ",
                "624,357 ",
                "THU GOC CTY THIEN PHUC "
            ],
            [
                "3881206236 ",
                "31/03/2022 ",
                "31/03/2022 ",
                "CRIN ",
                "",
                "",
                "24 ",
                "624,381 ",
                ""
            ],
            [
                "3883040328 ",
                "01/04/2022 ",
                "01/04/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "591,381 ",
                ""
            ],
            [
                "S6CT ",
                "Ngay GD ",
                "Ngay hieu luc ",
                "Loai GD ",
                "So sec/so ref ",
                "Phat sinh ng ",
                "Phat sinh co ",
                "sodur ",
                "Noi dung "
            ],
            [
                "3889218499 ",
                "05/04/2022 ",
                "05/04/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "558,381 ",
                ""
            ],
            [
                "3893174699 ",
                "08/04/2022 ",
                "08/04/2022 ",
                "NBCR ",
                "",
                "0 ",
                "13.400.000 ",
                "13.958.381 ",
                "Nguyen Thanh Dien chuyen tien "
            ],
            [
                "3894632773 ",
                "09/04/2022 ",
                "09/04/2022 ",
                "CLDR ",
                "0000981684 ",
                "13.304.083 ",
                "0 ",
                "654,298 ",
                "THUNOTU DONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "3925038561 ",
                "30/04/2022 ",
                "30/04/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "621,298 ",
                ""
            ],
            [
                "3935455116 ",
                "07/05/2022 ",
                "07/05/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "591,298 ",
                ""
            ],
            [
                "3935455117 ",
                "07/05/2022 ",
                "07/05/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "588,298 ",
                ""
            ],
            [
                "3937033147 ",
                "09/05/2022 ",
                "09/05/2022 ",
                "FTCR ",
                "60122015332 06 ",
                "0 ",
                "13,200.000 ",
                "13,788,298 ",
                "IBNOPTIEN "
            ],
            [
                "3937857487 ",
                "09/05/2022 ",
                "09/05/2022 ",
                "CLDR ",
                "0000981684 ",
                "13,090,917 ",
                "",
                "697.381 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "3972014326 ",
                "01/06/2022 ",
                "01/06/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "664,381 ",
                ""
            ],
            [
                "3980038454 ",
                "06/06/2022 ",
                "06/06/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "634,381 ",
                ""
            ],
            [
                "3980038455 ",
                "06/06/2022 ",
                "06/06/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "631,381 ",
                ""
            ],
            [
                "3983941723 ",
                "09/06/2022 ",
                "09/06/2022 ",
                "FTCR ",
                "60122019585 11 ",
                "0 ",
                "13,100,000 ",
                "13,731,381 ",
                "IBNOPTIEN "
            ],
            [
                "3984661208 ",
                "09/06/2022 ",
                "09/06/2022 ",
                "CLDR ",
                "0000981684 ",
                "13,083,811 ",
                "0 ",
                "647,570 ",
                "THUNO TUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "4018130741 ",
                "01/07/2022 ",
                "01/07/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "614,570 ",
                ""
            ],
            [
                "4024713145 ",
                "05/07/2022 ",
                "05/07/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "584,570 ",
                ""
            ],
            [
                "4024713146 ",
                "05/07/2022 ",
                "05/07/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "581,570 ",
                ""
            ],
            [
                "4029703859 ",
                "09/07/2022 ",
                "09/07/2022 ",
                "NBCR ",
                "",
                "0 ",
                "13,000,000 ",
                "13.581.570 ",
                "NOPTIEN-090722- 08:10:59762782 "
            ],
            [
                "4030345858 ",
                "09/07/2022 ",
                "09/07/2022 ",
                "CLDR ",
                "0000981684 ",
                "12,877,750 ",
                "0 ",
                "703,820 ",
                "THUNOTU DONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "4063703738 ",
                "31/07/2022 ",
                "31/07/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "670,820 ",
                ""
            ],
            [
                "4072380882 ",
                "05/08/2022 ",
                "05/08/2022 ",
                "SMR1 ",
                "",
                "30.000 ",
                "",
                "640.820 ",
                ""
            ],
            [
                "4072380883 ",
                "05/08/2022 ",
                "05/08/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "637,820 ",
                ""
            ],
            [
                "4077965387 ",
                "09/08/2022 ",
                "09/08/2022 ",
                "CLDR ",
                "0000981684 ",
                "12,637,820 ",
                "0 ",
                "500,000 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "4078872806 ",
                "10/08/2022 ",
                "10/08/2022 ",
                "FTCR ",
                "60122027538 80 ",
                "0 ",
                "500.000 ",
                "1.000.000 ",
                "IBNOPTIEN "
            ],
            [
                "4079755709 ",
                "10/08/2022 ",
                "10/08/2022 ",
                "CLDR ",
                "0000981684 ",
                "225,839 ",
                "0 ",
                "774,161 ",
                "THUNO TU DONG HD0095/CTYTHIEN "
            ],
            [
                "4092996906 ",
                "19/08/2022 ",
                "19/08/2022 ",
                "FTCR ",
                "60122028758 94 ",
                "0 ",
                "62,000.000 ",
                "62,774,161 ",
                "IBNOPTIEN "
            ],
            [
                "4114255972 ",
                "01/09/2022 ",
                "01/09/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "62,741,161 ",
                ""
            ],
            [
                "4127118892 ",
                "09/09/2022 ",
                "09/09/2022 ",
                "CLDR ",
                "0000981684 ",
                "22,753,403 ",
                "0 ",
                "39,987,758 ",
                "THUNOTUDONG HD0095/CTYTHIEN "
            ],
            [
                "4131691146 ",
                "12/09/2022 ",
                "12/09/2022 ",
                "NBCR ",
                "",
                "0 ",
                "12,800,000 ",
                "52,787,758 ",
                "Nguyen Thanh Dien chuyen tien "
            ],
            [
                "4134941955 ",
                "14/09/2022 ",
                "14/09/2022 ",
                "CLDR ",
                "0000981684 ",
                "50,000,000 ",
                "0 ",
                "2,787.758 ",
                "THUGOCHOANCC T10.11,12.1,2/CTY CP XAY DU'NG GIAO THONG THIEN PHUC "
            ],
            [
                "4163367783 ",
                "01/10/2022 ",
                "01/10/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "",
                "2,754,758 ",
                ""
            ],
            [
                "4178836625 ",
                "10/10/2022 ",
                "10/10/2022 ",
                "CLDR ",
                "0000981684 ",
                "2,254,758 ",
                "0 ",
                "500,000 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "BTTLR3888 4/32 ",
                "11/10/2022 ",
                "11/10/2022 ",
                "CASD ",
                "",
                "0 ",
                "10,500,000 ",
                "11,000,000 ",
                "NGUYEN THANH DIEN NOP TIENVAY "
            ],
            [
                "4180638556 ",
                "11/10/2022 ",
                "11/10/2022 ",
                "CLDR ",
                "0000981684 ",
                "9.821.742 ",
                "0 ",
                "1,178,258 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "4212704604 ",
                "30/10/2022 ",
                "30/10/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "1,145,258 ",
                ""
            ],
            [
                "24294867 ",
                "05/11/2022 ",
                "05/11/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "1,115,258 ",
                ""
            ],
            [
                "4224294868 ",
                "05/11/2022 ",
                "05/11/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "1,112,258 ",
                ""
            ],
            [
                "4230665269 ",
                "09/11/2022 ",
                "09/11/2022 ",
                "CLDR ",
                "0000981684 ",
                "612,258 ",
                "0 ",
                "500,000 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "4231588983 ",
                "10/11/2022 ",
                "10/11/2022 ",
                "NBCR ",
                "",
                "0 ",
                "11,200,000 ",
                "11,700,000 ",
                "NOPTIEN-101122- 0834:04076443 "
            ],
            [
                "4232689703 10/11/2022 10/11/2022 ",
                "CLDR ",
                "0000981684 ",
                "11,200,000 ",
                "0 ",
                "500,000 ",
                "THU NO TU DONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "423412541211/11/2022 11/11/2022 TKoi Ung 607704060205949 Ctpy A/C No. ",
                "EBCR ",
                "",
                "0 ",
                "5,630 ",
                "505,630 ",
                "LEMINH KHOA chuven tien den CTY CPXAY DUNG GIAO THONG THIEN PHUC- 607704060102224 "
            ],
            [
                "423470969311/11/2022 11/11/2022 ",
                "CLDR ",
                "0000981684 ",
                "5,629 ",
                "0 ",
                "500,001 ",
                "THUNOTUDONG HD0095/CTYTHIEN "
            ],
            [
                "423556379812/11/2022 12/11/2022 ",
                "NBCR ",
                "",
                "0 ",
                "200,000 ",
                "700,001 ",
                "NOPTIEN-121122 08:10:55211782 "
            ],
            [
                "4266558760 29/11/2022 29/11/2022 ",
                "SC32 ",
                "",
                "33,000 ",
                "0 ",
                "667,001 ",
                ""
            ],
            [
                "4278668764 05/12/2022 05/12/2022 ",
                "SMR1 ",
                "",
                "30,000 ",
                "0 ",
                "637,001 ",
                ""
            ],
            [
                "4278668765 05/12/2022 05/12/2022 ",
                "VATX ",
                "",
                "3,000 ",
                "0 ",
                "634,001 ",
                ""
            ],
            [
                "428545962109/12/2022 09/12/2022 ",
                "CLDR ",
                "0000981684 ",
                "134,001 ",
                "0 ",
                "500,000 ",
                "THUNOTUDONG HD0095/CTYTHIEN PHUC "
            ],
            [
                "429617388715/12/2022 15/12/2022 ",
                "NBCR ",
                "",
                "0 ",
                "162,100,000 ",
                "162,600,000 ",
                "TATTOANKHOAN VAY-151222- "
            ],
            [
                "",
                "",
                "",
                "",
                "",
                "",
                "13:31:04236614 "
            ],
            [
                "4296206750 15/12/2022 15/12/2022 ",
                "CLDR ",
                "0000981684 ",
                "160,000,000 ",
                "0 ",
                "2,600,000 ",
                "THUTTKU0095/CTY CPXAY DUNG GIAO THONG THIEN PHUC(PHAT0%) (XE-KHOA) "
            ],
            [
                "4296208722 15/12/2022 15/12/2022 ",
                "CLDR ",
                "0000981684 ",
                "2,048,331 ",
                "0 ",
                "551,669 ",
                "THU TTKU0095/CTY CP XAY DUNG GIAO THONG THIEN PHUC(PHAT 0%) (XE-KHOA) "
            ],
            [
                "429621190015/12/2022 15/12/2022 ",
                "FTDR ",
                "60722712634 46 ",
                "50,000 ",
                "0 ",
                "501,669 ",
                "THUPHIXOAGDDE CTY THIEN PHUC "
            ],
            [
                "S6CT ",
                "Ngay GD ",
                "Ngay hieu luc ",
                "Loai ",
                "GD Sosec/So ref ",
                "Phat sinh ng ",
                "Phat sinh co ",
                "sodu ",
                "Noi dung "
            ]
        ]
    }

    const readTransactionFromPDF = input => {
        let titleIndex = null;

        const timeKeys = ['Ngay giao dich (Trans.Date)', 'Ngay ', 'Ngay hieu luc'];
        const referenceNumberKeys = ['Ma giao dich (Trans.Code)', 'S6 GD ', 'S6CT'];
        const debitKeys = ['Phat sinh no (Debit amount)', 'Ghi ng ', 'Phat sinh ng'];
        const creditKeys = ['Phat sinh co (Credit amount)', 'Ghi c6 ', 'Phat sinh co'];
        const descriptionKeys = ['Dien giai (Txn. Description)', 'Dien giai ', 'Noi dung'];

        const bankAccount = input.account_number;
        const data = input.data.map(row => row.map(cell => cell.trim()));
        
        const result = [];

        // Lấy vị trí của key trên dòng title
        const getIndex = (row = [], keys) =>{
            let index = null;
            for (const [idx, element] of row.entries()){
                if(includes(keys, element)){
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
                if(moment(element).isValid() && !status){
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
                debitAmount: item[getIndex(data[titleIndex], debitKeys)],
                creditAmount: item[getIndex(data[titleIndex], creditKeys)],
                referenceNumber: item[getIndex(data[titleIndex], referenceNumberKeys)],
            }
        }))

        console.log('====', titleIndex);
        
    }

    readTransactionFromPDF(pdfData);
