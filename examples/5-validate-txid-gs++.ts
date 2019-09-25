/***************************************************************************************
 *
 *  Example 5: Validate a specific txid using GS++.  This method comes with no burn protections.
 *
 *  Instructions:
 *      (1) - Set GRPC URL
 *      (2) - Optional: set custom txid.
 *
 * ************************************************************************************/

import grpc from 'grpc';
import { GraphSearchRequest, GraphSearchReply } from './pb/graphsearch_pb';
import { GraphSearchServiceClient} from './pb/graphsearch_grpc_pb';

import { ValidatorType1, Crypto } from '../index';

const GRPC_URL = 'localhost:50051';
const txid = "9cd705998fcc233ccf0a840f4ee7fcbc1eb678eba79e708560ecc95fedecfec9";


(async function() {
    console.time("SLP-VALIDATE-GS++");

    const clientOptions: Partial<grpc.CallOptions> = {
        'grpc.max_receive_message_length': 1024*1024*1024, // 1GiB
    };
    const client = new GraphSearchServiceClient(
        GRPC_URL,
        grpc.credentials.createInsecure(),
        clientOptions
    );

    const request = new GraphSearchRequest();
    request.setTxid(txid);

    client.graphSearch(request, async (err: grpc.ServiceError | null, response: GraphSearchReply) => {
        if (err) {
            console.log(err);
            return;
        }

        const txdatalist = response.getTxdataList_asU8(); // or asU8
        console.log(txid, txdatalist.length);

        let dag: Map<string, Buffer> = new Map();

        for (const txdata of txdatalist) {
            const txdata_buf = Buffer.from(txdata);
            const txid = Crypto.hash256(txdata_buf).toString('hex');
            dag.set(txid, txdata_buf);
        }

        const null_txdata_buf = Buffer.from('00'.repeat(60), 'hex');
        const slpValidator = new ValidatorType1({ getRawTransaction: async (txid: string) => {
            return dag.get(txid) || null_txdata_buf;
        } });

        console.log("Validating:", txid);
        console.log("This may take a several seconds...");
        let isValid = await slpValidator.isValidSlpTxid({ txid });
        console.log("Final Result:", isValid);
        console.log("WARNING: THIS VALIDATION METHOD COMES WITH NO BURN PROTECTION.")
        console.timeEnd("SLP-VALIDATE-GS++");
    });
})();
