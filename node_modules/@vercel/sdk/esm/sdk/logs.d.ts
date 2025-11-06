import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import { GetRuntimeLogsRequest, GetRuntimeLogsResponseBody } from "../models/getruntimelogsop.js";
export declare class Logs extends ClientSDK {
    /**
     * Get logs for a deployment
     *
     * @remarks
     * Returns a stream of logs for a given deployment.
     */
    getRuntimeLogs(request: GetRuntimeLogsRequest, options?: RequestOptions): Promise<GetRuntimeLogsResponseBody>;
}
//# sourceMappingURL=logs.d.ts.map