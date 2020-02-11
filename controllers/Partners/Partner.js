import {
    sequelize,
    login,
    partner_details,
    partner_data_list
} from './../../models';

import q from 'q';

import xlsx from 'node-xlsx';
var md5 = require('md5');

const put = (data) => {
    let defer = q.defer();
    if (!data.login_id) {
        defer.reject({
            status: 403,
            message: "Login Id is missing"
        });
        return defer.promise;
    }
   partner_details.update(data,{
       where:{
           login_id:data.login_id
       }
   }).then(partnerdata=>{
    if(partnerdata){
        partner_details.findOne({where:{
            login_id:data.login_id}
        }).then(partnerdetailsdata=>{
            defer.resolve(partnerdetailsdata)
        }).catch(error => {
            defer.reject({
                status: 400,
                message: error.message
            });
            return defer.promise;
        });
    }
   }).catch(error => {
            defer.reject({
                status: 400,
                message: error.message
            });
            return defer.promise;
        });
    return defer.promise;
}

const get = (req) =>{
    let defer = q.defer();
    let data = req.params;
    if (!data.login_id) {
        defer.reject({
            status: 403,
            message: "Login Id is missing"
        });
        return defer.promise;
    }
    partner_data_list.findAll(
        {where:{login_id:data.login_id},
        order:[
            ['id','DESC']
        ]}
        ).then(datalist=>{
        defer.resolve(datalist);
    }).catch(error => {
            defer.reject({
                status: 400,
                message: error.message
            });
            return defer.promise;
        });
    return defer.promise;
}
const post = (req,file) =>{
    let defer = q.defer();
    let promises = [];
    let data = req.params;
    if(!data.login_id){
        defer.reject({
            status:403,
            message:"Login Id missing"
        });
        return defer.promise;
    }
    var fs = require('fs');

    const workSheetsFromFile = xlsx.parse(`${file[0].path}`);
    if(workSheetsFromFile[0].data.length ==1 || !workSheetsFromFile[0].data.length){
        defer.reject({
            status:403,
            message:"File contains empty data"
        });
        return defer.promise;
    }
    var fs = require('fs');
    var duplicate = "duplicate";
    var dir = duplicate.concat('/partner_'+req.params.login_id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
        fs.copyFile(file[0].path,'duplicate/partner_'+ data.login_id +'/'+ file[0].originalname,(err)=>{
            if(err){console.log(err)}
        })
        let body = {
            "login_id":data.login_id,
            "url": file[0].path,
            "name":file[0].originalname,
            "file_size":workSheetsFromFile[0].data.length - 1,
            "status":0
    
        };
        partner_data_list.create(body).then(datalist=>{
            defer.resolve(datalist);
        }).catch(error=>{
            defer.reject({
                status: 400,
                message: error.message
            });
            return defer.promise;
        })
    
    
    return defer.promise;

}
const Delete = (req) =>{
    let defer = q.defer();
    let data = req.params;
    if(!data.partner_id){
        defer.reject({
            status:403,
            message:"Id is  missing"
        });
        return defer.promise;
    }
    let updatedata = {
        "active":0,
        "status":100
    }
    partner_data_list.update(updatedata,{
        where:{
            id:data.partner_id
        }
    }).then(updateddata=>{
        defer.resolve(updateddata);
    }).catch(error=>{
        defer.reject({
            status: 400,
            message: error.message
        });
        return defer.promise;
    })
    return defer.promise;
}
const getPartnerDetails = (req) =>{
    let defer = q.defer();
    let data = req.params;
    if (!data.login_id) {
        defer.reject({
            status: 403,
            message: "Login Id is missing"
        });
        return defer.promise;
    }
    login.hasOne(partner_details, { foreignKey: 'login_id', targetKey: 'id' });
	partner_details.belongsTo(login, { foreignKey: 'login_id', targetKey: 'id' });
    login.findOne({
            where: {
                id:data.login_id
            },include: [
                {
                    model: partner_details
                }]
        })
        .then(function (logindata) {
                defer.resolve(logindata)
        }).catch(error => {
            defer.reject({
                status: 400,
                message: error.message
            });
            return defer.promise;
        });
    return defer.promise;
}
const Partner = {
    put,
    get,
    post,
    Delete,
    getPartnerDetails
};

export {
    Partner
};