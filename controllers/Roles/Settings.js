const UserModel = require('../../models/UserModel');
const View = require('../../helpers/View');

// exports.updateamdrecipt = async (req, res) => {
//     const recieptid = req.params.id;
//     const staff_id = req.user.staff_id;

//     let errors = {};
//     let message = "";
//     let messageType = "";
//     const TableName = "receipt_details";

//     const newTable = "receipt_details_update";
//     // Get receipt
//     const receipt = await UserModel.getSingleRecord(
//         TableName,
//         { id: recieptid },
//         "*"
//     );

//     const Updaterecord = await UserModel.getSingleRecord(
//         newTable,
//         { receipt_no: receipt.receipt_no },
//         "*"
//     );
//     const student_id = receipt.student_id;
//     const student = await UserModel.getSingleRecord(
//         "students",
//         { student_id },
//         "student_id,total_fees,pending_fees,available_fees,course,course_year"
//     );
//     let amount = receipt.amount;
//     let remarks = receipt.remarks || "";
//     if (req.method === "POST") {
//         amount = req.body.amount || "";
//         remarks = req.body.remarks || "";
//         errors.amount = !amount
//             ? "Amount field required"
//             : !/^\d+$/.test(amount)
//                 ? "Only digits allowed"
//                 : "";
//         Object.keys(errors).forEach((k) => !errors[k] && delete errors[k]);
//         const oldAmount = Number(receipt.amount);
//         const newAmount = Number(amount);
//         let difference = 0;
//         let newAvailableFees = 0;
//         let newPendingFees = 0;
//         let recieptAwailable = Number(receipt.available_fees);
//         if (Object.keys(errors).length === 0) {

//             if (!Updaterecord || Number(Updaterecord.status) != 0) {
//                 if (newAmount > 0) {
//                     if (newAmount != oldAmount) {
//                         if (oldAmount > newAmount) {
//                             difference = oldAmount - newAmount;
//                             newPendingFees = Number(student.pending_fees) - difference;
//                             newAvailableFees = Number(student.available_fees) + difference;
//                         } else {
//                             difference = newAmount - oldAmount;
//                             newPendingFees = Number(student.pending_fees) + difference;
//                             newAvailableFees = Number(student.available_fees) - difference;
//                         }
//                         if (newPendingFees > Number(student.total_fees)) {
//                             message = `Amount cannot exceed remaining fees.`;
//                             messageType = "error";
//                         } else if (newPendingFees < 0) {
//                             message = "Invalid amount.";
//                             messageType = "error";
//                         } else {
//                             await UserModel.addRecord(newTable, {
//                                 student_id:receipt.student_id,
//                                 table_id:receipt.id,
//                                 receipt_no:receipt.receipt_no,
//                                 amount:oldAmount,
//                                 new_amount:newAmount,
//                                 remarks:receipt.remarks,
//                                 total_fees: Number(receipt.total_fees),
//                                 available_fees: recieptAwailable,
//                                 payment_mode:receipt.payment_mode,
//                                 transaction_id:receipt.transaction_id,
//                                 course_id: receipt.course_id,
//                                 year: receipt.year,
//                                 staff_id:receipt.staff_id,
//                                 request_id:staff_id,
//                                 student_available:newAvailableFees,
//                                 student_pending:newPendingFees
//                             });
//                             message = 'Receipt Updated successfully!';
//                             messageType = 'success';
//                         }
//                     } else {
//                         message = "Please Set New Amount";
//                         messageType = "error";
//                     }
//                 } else {
//                     message = "Minimum Amount Is " + CONSTANTS.currency + ' 1';
//                     messageType = "error";
//                 }
//             } else {
//                 message = "This Reciept Already Pending Please Wait .....";
//                 messageType = "error";
//             }
//         } else {
//             message = "Fix validation errors";
//             messageType = "error";
//         }
//     }

//     const fields = `
//         ${Form.label("Amount")}
//         <input
//             type="text"
//             name="amount"
//             value="${amount}"
//             class="form-control ${errors.amount ? "is-invalid" : ""}"
//             placeholder="Enter Amount"
//             oninput="this.value=this.value.replace(/[^0-9]/g,'')"
//         >
//         ${errors.amount
//             ? `<div class="text-danger small mt-1">${errors.amount}</div>`
//             : ""
//         }

//         ${Form.label("Remarks")}
//         <textarea
//             name="remarks"
//             class="form-control"
//             rows="3"
//             placeholder="Enter Remarks"
//         >${remarks}</textarea>
//     `;

//     const buttons = `
//         ${Form.submit("Update Receipt", {
//         class: "btn btn-dark"
//     })}
//     `;

//     const response = {
//         title: "Update Admission Receipt",
//         action: CONSTANTS.role + "update-adm-reciept/" + recieptid,
//         method: "POST",
//         message,
//         messageType,
//         errors,
//         fields,
//         buttons,
//         redirect: CONSTANTS.role + "update-adm-reciept/" + recieptid,
//         redirectUrl: CONSTANTS.role + "update-adm-reciept/" + recieptid,
//         studentFeesUrl: CONSTANTS.role + "student-fees",
//         currency: CONSTANTS.currency
//     };

//     return View.Rview(res, "reciept2", response);
// };


exports.updateamdrecipt = async (req, res) => {
    try {
        const staff_id = req.user.staff_id;
        const recieptid = req.body.id;
        const type = req.body.type;
        let amount = req.body.amount || "";
        let remarks = req.body.remarks || "";
        const errors = {};
        if (!amount) {
            errors.amount = "Amount field required";
        } else if (!/^\d+$/.test(amount)) {
            errors.amount = "Only digits allowed";
        }
        if (Object.keys(errors).length > 0) {
            return res.json({
                status: false,
                message: "Fix validation errors",
                errors
            });
        }
        let Table = "";
        if (type === "admission") {
            Table = "receipt_details";
        } else if (type === "balance") {
            Table = "balance_receipt_details";
        } else {
            Table = "";
        }
        if (!Table) {
            return res.json({
                status: false,
                message: "Something went wrong."
            });
        }
        const receipt = await UserModel.getSingleRecord(
            Table,
            { id: recieptid },
            "*"
        );
        if (!receipt) {
            return res.json({
                status: false,
                message: "Receipt not found."
            });
        }
        const student = await UserModel.getSingleRecord(
            "students",
            { student_id: receipt.student_id },
            "*"
        );
        if (!student) {
            return res.json({
                status: false,
                message: "Student not found."
            });
        }
        const newTable = "receipt_details_update";
        const Updaterecord = await UserModel.getSingleRecord(
            newTable,
            {
                table_id: recieptid,
                status: 0
            },
            "*"
        );
        const oldAmount = Number(receipt.amount);
        const newAmount = Number(amount);
        let difference = 0;
        let newAvailableFees = 0;
        let newPendingFees = 0;
        const recieptAwailable = Number(receipt.available_fees);
        if (Updaterecord && Number(Updaterecord.status) === 0) {
            return res.json({
                status: false,
                message: "This Receipt Already Pending Please Wait..."
            });
        }
        if (newAmount <= 0) {
            return res.json({
                status: false,
                message: "Minimum Amount Is " + CONSTANTS.currency + "1"
            });
        }
        if (newAmount === oldAmount) {
            return res.json({
                status: false,
                message: "Please Set New Amount"
            });
        }
        if (oldAmount > newAmount) {
            difference = oldAmount - newAmount;
            newPendingFees = Number(student.pending_fees) - difference;
            newAvailableFees = Number(student.available_fees) + difference;
        } else {
            difference = newAmount - oldAmount;
            newPendingFees = Number(student.pending_fees) + difference;
            newAvailableFees = Number(student.available_fees) - difference;
        }
        if (newPendingFees > Number(student.total_fees)) {
            return res.json({
                status: false,
                message: "Amount cannot exceed remaining fees."
            });
        }
        if (newPendingFees < 0) {
            return res.json({
                status: false,
                message: "Invalid amount."
            });
        }
        await UserModel.addRecord(newTable, {
            student_id: receipt.student_id,
            table_id: receipt.id,
            receipt_no: receipt.receipt_no,
            amount: oldAmount,
            type: type,
            new_amount: newAmount,
            reciept_table:Table,
            remarks: remarks,
            total_fees: receipt.total_fees,
            available_fees: recieptAwailable,
            payment_mode: receipt.payment_mode,
            transaction_id: receipt.transaction_id,
            course_id: receipt.course_id,
            year: receipt.year,
            staff_id: receipt.staff_id,
            request_id: staff_id,
            student_available: newAvailableFees,
            student_pending: newPendingFees,
            created_at: new Date()

        });
        return res.json({
            status: true,
            message: "Receipt Update Request Submitted Successfully."
        });
    } catch (err) {
        console.log(err);
        return res.json({
            status: false,
            message: "Something went wrong."
        });
    }
};