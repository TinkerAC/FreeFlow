import {BilibiliService} from "../../src/main/contentProvider/Bilibili/BilibiliService";


describe(
    'BilibiliService', () => {
        let bService = new BilibiliService();

        test('searchByKey', async () => {
            const resp = await bService.searchByKey("仙剑鸡")
            const result = resp.data
            console.dir(result, {depth: null, colors: true});
            expect(result).toBeDefined();

        })


        test("getVideoInfo",async ()=>{
            const resp = await bService.getVideoInfo("BV1k7411x7gA")
            const result =resp
            console.dir(result, {depth: null, colors: true});


        })



    }
)