"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthBaseController = void 0;
class AuthBaseController {
    SendResponse(Type, Message, AddtionalReponse = null) {
        if (AddtionalReponse) {
            return { Type, Message, AddtionalData: AddtionalReponse };
        }
        else {
            return { Type, Message };
        }
    }
    SendResponseData(ResponseData) {
        return ResponseData;
    }
    SendErrorResponse(e) {
        throw new Error(e.message);
    }
}
exports.AuthBaseController = AuthBaseController;
//# sourceMappingURL=AuthBase.controller.js.map