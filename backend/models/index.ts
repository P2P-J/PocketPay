const User = require("./User.model");
const Deal = require("./Deal.model");
const Team = require("./Team.model");
const FeePayment = require("./FeePayment.model");
const WithdrawnOauth = require("./withdrawnOauth.model");
const VerificationCode = require("./VerificationCode.model");
const DutchRequest = require("./DutchRequest.model");
const OAuthExchangeCode = require("./OAuthExchangeCode.model");

module.exports = { User, Deal, Team, FeePayment, WithdrawnOauth, VerificationCode, DutchRequest, OAuthExchangeCode };
