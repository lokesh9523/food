import {
    sequelize,
    partner_data_list,
    partner_details,
    login

} from './../../models';
var md5 = require('md5');
import q from 'q';
import {
    wss
} from '../../bin/www';
const yamlConfig = require('yaml-config');
const config = yamlConfig.readConfig('config.yml');

const get = (data) => {
    let defer = q.defer();
    defer.resolve({
        "message": "done"
    });
    return defer.promise;
}
const post = (req) => {

    let defer = q.defer();
    let data = req.params;
    let tokendata = req.tokendata;
    const readline = require('readline');
    const request = require('requestretry');
    const replace = require('replace-in-file');
    var fs = require('fs');
    if (!data.login_id) {
        defer.reject({
            status: 403,
            message: "Login Id is missing"
        });
        return defer.promise;
    }


    if (tokendata.data.id != data.login_id) {
        defer.reject({
            status: 403,
            message: "User Id mismatch"
        });
        return defer.promise;
    }
    partner_data_list.findOne({
        where: {
            login_id: data.login_id,
            id: data.file_id
        },
        raw: true
    }).then(filedata => {

        var linesCount = 0;
        if (filedata) {
            var file = filedata.url;

            var r = readline.createInterface({
                input: fs.createReadStream(file),
                output: process.stdout,
                terminal: false
            })
            r.on('line', function (line) {
                console.log(line, "---------------============================:wq")
                console.log(linesCount, "========================");
                try {
                    request({
                        url: "http://167.114.165.59/dapi/smtpverifyapi.php?email=" + line,
                        method: 'GET',
                        headers: {
                            "content-type": "application/json"
                        },
                        maxAttempts: 10, 
                        retryDelay: 5000, 
                        retryStrategy: request.RetryStrategies.HTTPOrNetworkError
                    }, function (error, response, body) {
                        if (body) {
                            let status = body.split(',');
                            console.log(status[0], "############### Email #################", status[1]);
                             linesCount++
                            console.log(linesCount,'===================================================count')
                            if (status[1] !== 'ok') {
                                const options = {
                                    files: filedata.url,
                                    from: line,
                                    to: '',
                                };
                                replace(options)
                                    .then(results => {
                                        console.log('Replacement results:', results);
                                        partner_data_list.findOne({
                                            where: {
                                                id: data.file_id
                                            },
                                            raw: true
                                        }).then(partnerdata => {
                                            var emailupdate = {};
                                            var emailcleanedcount = partnerdata.email_cleaned;
                                            emailupdate.email_cleaned = emailcleanedcount + 1;
                                            emailupdate.status = (100 / partnerdata.email_count) * emailupdate.email_cleaned;
                                            partner_data_list.update(emailupdate, {
                                                where: {
                                                    id: data.file_id
                                                }
                                            }).then(updatedemaildate => {
                                                partner_details.findOne({
                                                    where: {
                                                        login_id: data.login_id
                                                    },
                                                    raw: true
                                                }).then(partnerdetails => {
                                                    //  console.log(partnerdetails,"======================");
                                                    var ether_amount = partnerdetails.amount - 1;
                                                    //console.log(ether_amount,"======================================etheramount")
                                                    partner_details.update({
                                                        "amount": ether_amount
                                                    }, {
                                                        where: {
                                                            login_id: data.login_id
                                                        },
                                                        raw: true
                                                    }).then(updatespartnerdetails => {
                                                        // sendwebsocket = true;
                                                        if (filedata.email_count == linesCount) {
                                                            var wsData = {};
                                                            var wsData = {
                                                                login_id: data.login_id,
                                                                mails_cleand: emailupdate.email_cleaned,
                                                                file_id: data.file_id,
                                                                credits: ether_amount,
                                                                status: Math.ceil(emailupdate.status),
                                                                file_name:filedata.name,
                                                                method: 'Mailcleaning Completed'
                                                            };

                                                            console.log(wsData, "=================wsData")
                                                            wss.clients.forEach(function each(client) {
                                                                client.send(JSON.stringify(wsData));
                                                            });
                                                        }

                                                    }).catch(error => {
                                                        console.log(error, "===============================error5");
                                                    })
                                                }).catch(error => {
                                                    console.log(error, "===============================error4");
                                                })

                                            }).catch(error => {
                                                console.log(error, "===============================error3");
                                            })
                                        }).catch(error => {
                                            console.log(error, "=============================error2");
                                        });
                                    })
                                    .catch(error => {
                                        console.log(error, "=============================error1");
                                    });
                            } else {
                                console.log("iam here in else");
                                if (filedata.email_count == linesCount) {
                                    var wsData = {};
                                    login.hasOne(partner_details, {
                                        foreignKey: 'login_id',
                                        targetKey: 'id'
                                    });
                                    partner_details.belongsTo(login, {
                                        foreignKey: 'login_id',
                                        targetKey: 'id'
                                    });

                                    login.hasMany(partner_data_list, {
                                        foreignKey: 'login_id'
                                    });
                                    partner_data_list.belongsTo(login, {
                                        foreignKey: 'login_id'
                                    });

                                    login.findOne({
                                        where: {
                                            id: data.login_id,
                                            // id: data.file_id
                                        },
                                        include: [{
                                            model: partner_details
                                        }, {
                                            model: partner_data_list,where:{id:data.file_id}
                                        }]
                                    }).then(partnerdatalist => {
                                        var wsData = {
                                            login_id: data.login_id,
                                            mails_cleand: partnerdatalist.partner_data_lists[0].email_cleaned,
                                            file_id: data.file_id,
                                            credits: partnerdatalist.partner_detail.amount,
                                            status:partnerdatalist.partner_data_lists[0].status,
                                            file_name:partnerdatalist.partner_data_lists[0].name,
                                            method: 'Mailcleaning Completed'
                                        };
                                        console.log(wsData, "=================wsData")
                                        wss.clients.forEach(function each(client) {
                                            client.send(JSON.stringify(wsData));
                                        });
                                        // defer.resolve(partnerdatalist);
                                    }).catch(error => {
                                        console.log(error,"=============");
                                    });


                                }
                            }

                        }
                        if (error) {
                            // rl.on('pause', () => {
                            //     console.log('Readline paused.=================================');
                            //   });
                            // console.log(error.code === 'ETIMEDOUT');
                            // console.log(error,"=============================error")
                            // console.log(line,"=========================email")
                            // console.log("======================error")
                        }


                    })
                } catch (error) {
                    next(error);
                }

                // }


            });
            r.on('close', function () {
                partner_data_list.findOne({
                    where: {
                        id: data.file_id,
                        login_id: data.login_id
                    }
                }).then(partnerdatalist => {
                    defer.resolve(partnerdatalist);
                }).catch(error => {
                    defer.reject({
                        status: 400,
                        message: error.message
                    });
                    return defer.promise;
                });
            });
        }
    })
    return defer.promise;
}


const Cleanemail = {
    get,
    post
};

export {
    Cleanemail
};