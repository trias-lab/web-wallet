"""
"""
from django.http import HttpResponse
from django.http import JsonResponse
from urllib import request as HttpReq
import json
from etherwallet.settings import CONF_JSON
from wallet.utils.logger import logger

def tri(request):
    postBody = request.body
    headers = {'Content-Type': 'application/json; charset=UTF-8'}

    supportedMethods = set(['eth_blockNumber',
                            'net_version',
                            'eth_getBalance',
                            'eth_getTransactionByHash',
                            'eth_gasPrice',
                            'eth_getTransactionCount',
                            'eth_sendRawTransaction',
                            'eth_estimateGas'])
    try:
        reqDict = json.loads(postBody)
        method = reqDict["method"]
        if not method:
            raise (Exception("method not find"))
        if not method in supportedMethods:
            raise (Exception("method not supported %s" % method))
    except Exception as e:
        logger.error(e)
        err = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
                "code": -1,
                "message": "not support method"
            }
        }
        return JsonResponse(err)

    with open(CONF_JSON, 'r') as conf:
        rec = conf.read()
    records = json.loads(rec)
    tri_ip = records['eth_ip']
    tri_port = records['eth_port']
    url = "http://" + tri_ip + ":" + tri_port
    req = HttpReq.Request(url, headers=headers, data=postBody)

    try:
        response = HttpReq.urlopen(req).read()
    except Exception as e:
        logger.error(e)
        err = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
                "code": -1,
                "message": "tri node connect error"
            }
        }
        return JsonResponse(err)

    response = HttpResponse(response)
    return response





