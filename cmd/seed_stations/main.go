package main

import (
	"fmt"
	"log"
	"logistics-system/config"
	"logistics-system/database"
	"logistics-system/models"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

type stationSeed struct {
	StationCode  string
	Name         string
	Type         models.StationType
	Country      string
	Province     string
	City         string
	Address      string
	Latitude     float64
	Longitude    float64
	Capacity     int
	ContactName  string
	ContactPhone string
	WorkingHours string
	Remark       string
}

type serviceAreaSeed struct {
	StationCode string
	Country     string
	Province    string
	City        string
	District    string
	Priority    int
	Remark      string
}

func main() {
	loadDotEnvUpward()
	cfg := config.LoadConfig()
	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("init db failed: %v", err)
	}

	stations := realisticStations()
	created := 0
	updated := 0
	stationIDByCode := make(map[string]uint, len(stations))

	for _, seed := range stations {
		var station models.Station
		err := database.DB.Where("station_code = ?", seed.StationCode).First(&station).Error
		if err != nil {
			station = models.Station{StationCode: seed.StationCode}
			created++
		} else {
			updated++
		}

		station.Name = seed.Name
		station.Type = seed.Type
		station.Country = seed.Country
		station.Province = seed.Province
		station.City = seed.City
		station.Address = seed.Address
		station.Latitude = seed.Latitude
		station.Longitude = seed.Longitude
		station.Capacity = seed.Capacity
		station.ContactName = seed.ContactName
		station.ContactPhone = seed.ContactPhone
		station.WorkingHours = seed.WorkingHours
		station.Status = 1
		station.Remark = seed.Remark

		if station.ID == 0 {
			if err := database.DB.Create(&station).Error; err != nil {
				log.Fatalf("create station %s failed: %v", seed.StationCode, err)
			}
		} else {
			if err := database.DB.Save(&station).Error; err != nil {
				log.Fatalf("update station %s failed: %v", seed.StationCode, err)
			}
		}
		stationIDByCode[station.StationCode] = station.ID
	}

	for _, area := range defaultServiceAreas(stations) {
		stationID := stationIDByCode[area.StationCode]
		if stationID == 0 {
			continue
		}

		var existing models.StationServiceArea
		err := database.DB.Where(
			"station_id = ? AND country = ? AND province = ? AND city = ? AND district = ?",
			stationID, area.Country, area.Province, area.City, area.District,
		).First(&existing).Error
		if err != nil {
			existing = models.StationServiceArea{
				StationID: stationID,
				Country:   area.Country,
				Province:  area.Province,
				City:      area.City,
				District:  area.District,
			}
		}

		existing.Priority = area.Priority
		existing.Status = 1
		existing.Remark = area.Remark

		if existing.ID == 0 {
			if err := database.DB.Create(&existing).Error; err != nil {
				log.Fatalf("create service area for %s failed: %v", area.StationCode, err)
			}
		} else {
			if err := database.DB.Save(&existing).Error; err != nil {
				log.Fatalf("update service area for %s failed: %v", area.StationCode, err)
			}
		}
	}

	fmt.Printf("seed complete: created=%d updated=%d total=%d\n", created, updated, len(stations))
}

func loadDotEnvUpward() {
	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	dir := cwd
	for {
		candidate := filepath.Join(dir, ".env")
		if _, err := os.Stat(candidate); err == nil {
			_ = godotenv.Load(candidate)
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return
		}
		dir = parent
	}
}

func realisticStations() []stationSeed {
	base := []stationSeed{
		{StationCode: "CN-SHA-OR-01", Name: "上海浦东跨境集货中心", Type: models.StationOrigin, Country: "中国", Province: "上海", City: "上海", Address: "上海市浦东新区华东路1688号", Latitude: 31.226964, Longitude: 121.808306, Capacity: 28000, ContactName: "王晨", ContactPhone: "021-58880001", WorkingHours: "00:00-24:00", Remark: "覆盖华东出口包裹揽收、入库和集货"},
		{StationCode: "CN-SZX-OR-01", Name: "深圳宝安跨境揽收中心", Type: models.StationOrigin, Country: "中国", Province: "广东", City: "深圳", Address: "深圳市宝安区福永街道桥头社区物流大道88号", Latitude: 22.639258, Longitude: 113.810664, Capacity: 26000, ContactName: "陈毅", ContactPhone: "0755-26660011", WorkingHours: "00:00-24:00", Remark: "华南出口主揽收站，承接珠三角电商包裹"},
		{StationCode: "CN-HGH-TR-01", Name: "杭州国际转运枢纽", Type: models.StationTransit, Country: "中国", Province: "浙江", City: "杭州", Address: "杭州市萧山区空港大道299号", Latitude: 30.235399, Longitude: 120.429570, Capacity: 22000, ContactName: "李川", ContactPhone: "0571-89990012", WorkingHours: "00:00-24:00", Remark: "华东中转与出口航班拼板中心"},
		{StationCode: "CN-CGO-TR-01", Name: "郑州航空中转中心", Type: models.StationTransit, Country: "中国", Province: "河南", City: "郑州", Address: "郑州市航空港区迎宾大道66号", Latitude: 34.527899, Longitude: 113.840851, Capacity: 24000, ContactName: "赵睿", ContactPhone: "0371-68880023", WorkingHours: "00:00-24:00", Remark: "中部航空转运枢纽，承接欧美流向航空件"},
		{StationCode: "CN-CAN-TR-01", Name: "广州南沙转运中心", Type: models.StationTransit, Country: "中国", Province: "广东", City: "广州", Address: "广州市南沙区万顷沙镇港前大道18号", Latitude: 22.737800, Longitude: 113.591179, Capacity: 18000, ContactName: "郭涛", ContactPhone: "020-39990035", WorkingHours: "06:00-23:00", Remark: "海运与陆运混合中转节点"},
		{StationCode: "CN-SHA-CUS-01", Name: "上海浦东海关监管仓", Type: models.StationCustoms, Country: "中国", Province: "上海", City: "上海", Address: "上海市浦东新区海天一路528号", Latitude: 31.153697, Longitude: 121.799805, Capacity: 12000, ContactName: "孙骏", ContactPhone: "021-68330008", WorkingHours: "08:00-22:00", Remark: "出口监管、查验与异常扣留处理站点"},
		{StationCode: "US-LAX-CUS-01", Name: "洛杉矶清关监管中心", Type: models.StationCustoms, Country: "美国", Province: "California", City: "Los Angeles", Address: "1101 S Santa Fe Ave, Los Angeles, CA 90021", Latitude: 34.030992, Longitude: -118.229324, Capacity: 10000, ContactName: "James Carter", ContactPhone: "+1-213-555-0101", WorkingHours: "08:00-20:00", Remark: "美国西海岸进口清关及查验点"},
		{StationCode: "DE-FRA-CUS-01", Name: "法兰克福关务处理中心", Type: models.StationCustoms, Country: "德国", Province: "Hesse", City: "Frankfurt", Address: "Cargo City Süd 60549 Frankfurt am Main", Latitude: 50.038799, Longitude: 8.562684, Capacity: 9000, ContactName: "Mia Schneider", ContactPhone: "+49-69-555-0202", WorkingHours: "07:00-21:00", Remark: "欧盟进口申报与税费处理中心"},
		{StationCode: "US-LAX-DS-01", Name: "洛杉矶末端配送站", Type: models.StationDestination, Country: "美国", Province: "California", City: "Los Angeles", Address: "4800 Alameda St, Vernon, CA 90058", Latitude: 34.001300, Longitude: -118.229743, Capacity: 15000, ContactName: "Sofia Davis", ContactPhone: "+1-323-555-0123", WorkingHours: "06:00-22:00", Remark: "美国西海岸目的站，承接洛杉矶区域派送"},
		{StationCode: "US-JFK-DS-01", Name: "纽约JFK末端配送站", Type: models.StationDestination, Country: "美国", Province: "New York", City: "New York", Address: "147-35 175th St, Jamaica, NY 11434", Latitude: 40.667630, Longitude: -73.776942, Capacity: 14000, ContactName: "Noah Wilson", ContactPhone: "+1-718-555-0144", WorkingHours: "06:00-22:00", Remark: "美国东海岸目的站，覆盖纽约都会区派送"},
		{StationCode: "DE-FRA-DS-01", Name: "法兰克福末端配送站", Type: models.StationDestination, Country: "德国", Province: "Hesse", City: "Frankfurt", Address: "Langer Kornweg 34A, 65451 Kelsterbach", Latitude: 50.050474, Longitude: 8.525311, Capacity: 11000, ContactName: "Lukas Braun", ContactPhone: "+49-69-555-0155", WorkingHours: "06:00-21:00", Remark: "德国及周边区域末端配送节点"},
		{StationCode: "SG-SIN-DS-01", Name: "新加坡樟宜配送站", Type: models.StationDestination, Country: "新加坡", Province: "Singapore", City: "Singapore", Address: "9 Airline Road, Singapore 819827", Latitude: 1.365590, Longitude: 103.979017, Capacity: 8000, ContactName: "Tan Wei Jie", ContactPhone: "+65-6555-0188", WorkingHours: "07:00-22:00", Remark: "东南亚目的站与城市配送节点"},
	}
	return append(base, nationalCoverageStations()...)
}

func nationalCoverageStations() []stationSeed {
	return []stationSeed{
		{StationCode: "BJ-001", Name: "北京顺义跨境揽收中心", Type: models.StationOrigin, Country: "中国", Province: "北京", City: "北京", Address: "北京市顺义区天竺综合保税区A区8号", Latitude: 40.086247, Longitude: 116.584563, Capacity: 26000, ContactName: "赵畅", ContactPhone: "010-68880031", WorkingHours: "00:00-24:00", Remark: "北京及华北加急集货主揽收站"},
		{StationCode: "CN-TSN-OR-01", Name: "天津滨海跨境始发中心", Type: models.StationOrigin, Country: "中国", Province: "天津", City: "天津", Address: "天津市滨海新区中心商务区新北路166号", Latitude: 39.084158, Longitude: 117.200983, Capacity: 18000, ContactName: "张超", ContactPhone: "022-68880061", WorkingHours: "00:00-24:00", Remark: "华北港口型始发站"},
		{StationCode: "CN-SJW-OR-01", Name: "石家庄冀中揽收中心", Type: models.StationOrigin, Country: "中国", Province: "河北", City: "石家庄", Address: "石家庄市正定新区中华北大街108号", Latitude: 38.042307, Longitude: 114.514860, Capacity: 15000, ContactName: "孔晚", ContactPhone: "0311-68880062", WorkingHours: "00:00-24:00", Remark: "冀中地区出口包裹揽收站"},
		{StationCode: "CN-TYN-OR-01", Name: "太原山西出口揽收站", Type: models.StationOrigin, Country: "中国", Province: "山西", City: "太原", Address: "太原市小店区南内环街318号", Latitude: 37.870590, Longitude: 112.548879, Capacity: 14000, ContactName: "高杰", ContactPhone: "0351-68880063", WorkingHours: "00:00-24:00", Remark: "山西地区出口包裹集货站"},
		{StationCode: "CN-HET-OR-01", Name: "呼和浩特北方揽收中心", Type: models.StationOrigin, Country: "中国", Province: "内蒙古自治区", City: "呼和浩特", Address: "呼和浩特市回民区海拉尔西街28号", Latitude: 40.842585, Longitude: 111.749181, Capacity: 12000, ContactName: "张晨", ContactPhone: "0471-68880064", WorkingHours: "06:00-22:00", Remark: "内蒙古牛羊绒和特产跨境包裹揽收站"},
		{StationCode: "CN-SHE-OR-01", Name: "沈阳东北跨境揽收中心", Type: models.StationOrigin, Country: "中国", Province: "辽宁", City: "沈阳", Address: "沈阳市沈北新区正良一路15号", Latitude: 41.805699, Longitude: 123.431472, Capacity: 16000, ContactName: "刘博", ContactPhone: "024-68880065", WorkingHours: "00:00-24:00", Remark: "东北地区出口包裹集货揽收"},
		{StationCode: "CN-CCO-OR-01", Name: "长春吉林揽收站", Type: models.StationOrigin, Country: "中国", Province: "吉林", City: "长春", Address: "长春市绿园区景阳大路2555号", Latitude: 43.816018, Longitude: 125.323544, Capacity: 13000, ContactName: "刘宇", ContactPhone: "0431-68880066", WorkingHours: "06:00-22:00", Remark: "吉林省电商出口包裹紧急快件站"},
		{StationCode: "CN-HRB-OR-01", Name: "哈尔滨北地揽收中心", Type: models.StationOrigin, Country: "中国", Province: "黑龙江", City: "哈尔滨", Address: "哈尔滨市道里区新阳北路66号", Latitude: 45.803775, Longitude: 126.534967, Capacity: 12000, ContactName: "周辰", ContactPhone: "0451-68880067", WorkingHours: "06:00-22:00", Remark: "黑龙江对俄及冷地商品包裹揽收"},
		{StationCode: "CN-NKG-OR-01", Name: "南京苏皖始发中心", Type: models.StationOrigin, Country: "中国", Province: "江苏", City: "南京", Address: "南京市江宁区秦淮路88号", Latitude: 32.060255, Longitude: 118.796877, Capacity: 19000, ContactName: "董江", ContactPhone: "025-68880068", WorkingHours: "00:00-24:00", Remark: "苏皖地区出口包裹前置揽收站"},
		{StationCode: "CN-HGH-OR-01", Name: "杭州电商揽收中心", Type: models.StationOrigin, Country: "中国", Province: "浙江", City: "杭州", Address: "杭州市余杭区新明路66号", Latitude: 30.274084, Longitude: 120.155070, Capacity: 21000, ContactName: "吴佳", ContactPhone: "0571-68880069", WorkingHours: "00:00-24:00", Remark: "浙江数字贸易出口包裹主收口"},
		{StationCode: "CN-HFE-OR-01", Name: "合肥安徽揽收站", Type: models.StationOrigin, Country: "中国", Province: "安徽", City: "合肥", Address: "合肥市蜀山区长宁大道1888号", Latitude: 31.820592, Longitude: 117.227239, Capacity: 14000, ContactName: "黄涛", ContactPhone: "0551-68880070", WorkingHours: "06:00-22:00", Remark: "安徽制造业与电商货源揽收站"},
		{StationCode: "CN-FOC-OR-01", Name: "福州福建始发中心", Type: models.StationOrigin, Country: "中国", Province: "福建", City: "福州", Address: "福州市闽侯县乌龙江南大道8号", Latitude: 26.074508, Longitude: 119.296494, Capacity: 15000, ContactName: "林嘉", ContactPhone: "0591-68880071", WorkingHours: "00:00-24:00", Remark: "福建本地及对台方向包裹收寄"},
		{StationCode: "CN-XMN-OR-01", Name: "厦门跨境揽收中心", Type: models.StationOrigin, Country: "中国", Province: "福建", City: "厦门", Address: "厦门市海沧区后井路28号", Latitude: 24.479834, Longitude: 118.089425, Capacity: 15000, ContactName: "许凯", ContactPhone: "0592-68880072", WorkingHours: "00:00-24:00", Remark: "福建南部及社交电商包裹揽收站"},
		{StationCode: "CN-KHN-OR-01", Name: "南昌江西揽收站", Type: models.StationOrigin, Country: "中国", Province: "江西", City: "南昌", Address: "南昌市高新区紫阳大道1688号", Latitude: 28.682892, Longitude: 115.858198, Capacity: 13500, ContactName: "何越", ContactPhone: "0791-68880073", WorkingHours: "06:00-22:00", Remark: "江西华中向量出口包裹揽收站"},
		{StationCode: "CN-TNA-OR-01", Name: "济南山东始发中心", Type: models.StationOrigin, Country: "中国", Province: "山东", City: "济南", Address: "济南市历下区经十路1055号", Latitude: 36.651216, Longitude: 117.120095, Capacity: 18000, ContactName: "吕铭", ContactPhone: "0531-68880074", WorkingHours: "00:00-24:00", Remark: "山东全省出口包裹主集散站"},
		{StationCode: "CN-CGO-OR-01", Name: "郑州中原揽收中心", Type: models.StationOrigin, Country: "中国", Province: "河南", City: "郑州", Address: "郑州市经开区新航海路66号", Latitude: 34.746600, Longitude: 113.625368, Capacity: 18000, ContactName: "梁明", ContactPhone: "0371-68880075", WorkingHours: "00:00-24:00", Remark: "河南及中部电商包裹揽收中心"},
		{StationCode: "CN-WUH-OR-01", Name: "武汉华中揽收中心", Type: models.StationOrigin, Country: "中国", Province: "湖北", City: "武汉", Address: "武汉市江夏区光谷大道777号", Latitude: 30.593099, Longitude: 114.305393, Capacity: 19000, ContactName: "许伟", ContactPhone: "027-68880076", WorkingHours: "00:00-24:00", Remark: "华中地区包裹揽收主节点"},
		{StationCode: "CN-CSX-OR-01", Name: "长沙湖南揽收站", Type: models.StationOrigin, Country: "中国", Province: "湖南", City: "长沙", Address: "长沙市雨花区万家丽路188号", Latitude: 28.228209, Longitude: 112.938814, Capacity: 15000, ContactName: "廖青", ContactPhone: "0731-68880077", WorkingHours: "06:00-22:00", Remark: "湖南制衣和家居用品包裹揽收站"},
		{StationCode: "CN-NNG-OR-01", Name: "南宁广西揽收站", Type: models.StationOrigin, Country: "中国", Province: "广西", City: "南宁", Address: "南宁市良庆区凯旋路90号", Latitude: 22.817002, Longitude: 108.366543, Capacity: 12000, ContactName: "韩琳", ContactPhone: "0771-68880078", WorkingHours: "06:00-22:00", Remark: "西南南向地区出口揽收站"},
		{StationCode: "CN-HAK-OR-01", Name: "海口海南揽收站", Type: models.StationOrigin, Country: "中国", Province: "海南", City: "海口", Address: "海口市美兰区国际新航路18号", Latitude: 20.044002, Longitude: 110.198293, Capacity: 10000, ContactName: "杨杉", ContactPhone: "0898-68880079", WorkingHours: "06:00-22:00", Remark: "海南免税商品包裹揽收与集货"},
		{StationCode: "CN-CTU-OR-01", Name: "成都西南揽收中心", Type: models.StationOrigin, Country: "中国", Province: "四川", City: "成都", Address: "成都市双流区航空港路999号", Latitude: 30.572815, Longitude: 104.066801, Capacity: 20000, ContactName: "罗鹏", ContactPhone: "028-68880080", WorkingHours: "00:00-24:00", Remark: "西南出口空运件和特产件揽收中心"},
		{StationCode: "CN-CKG-OR-01", Name: "重庆山城揽收站", Type: models.StationOrigin, Country: "中国", Province: "重庆", City: "重庆", Address: "重庆市渝北区金风路16号", Latitude: 29.563010, Longitude: 106.551556, Capacity: 16000, ContactName: "谢宇", ContactPhone: "023-68880081", WorkingHours: "00:00-24:00", Remark: "重庆及成渝区域包裹揽收站"},
		{StationCode: "CN-KWE-OR-01", Name: "贵阳黔中揽收站", Type: models.StationOrigin, Country: "中国", Province: "贵州", City: "贵阳", Address: "贵阳市观山湖区长岭路99号", Latitude: 26.647661, Longitude: 106.630153, Capacity: 11000, ContactName: "龙冰", ContactPhone: "0851-68880082", WorkingHours: "06:00-22:00", Remark: "贵州山地商品和咖啡包裹揽收站"},
		{StationCode: "CN-KMG-OR-01", Name: "昆明南向揽收中心", Type: models.StationOrigin, Country: "中国", Province: "云南", City: "昆明", Address: "昆明市官渡区长水航城大道66号", Latitude: 25.038890, Longitude: 102.718330, Capacity: 13000, ContactName: "孙乐", ContactPhone: "0871-68880083", WorkingHours: "06:00-22:00", Remark: "云南和南亚方向包裹揽收站"},
		{StationCode: "CN-XIY-OR-01", Name: "西安西北揽收中心", Type: models.StationOrigin, Country: "中国", Province: "陕西", City: "西安", Address: "西安市长安区航天区开元路9号", Latitude: 34.341568, Longitude: 108.940175, Capacity: 17000, ContactName: "陈琳", ContactPhone: "029-68880084", WorkingHours: "00:00-24:00", Remark: "西北地区一带一路向口包裹揽收站"},
		{StationCode: "CN-LHW-OR-01", Name: "兰州甘肃揽收站", Type: models.StationOrigin, Country: "中国", Province: "甘肃", City: "兰州", Address: "兰州市城关区雁白黄河路288号", Latitude: 36.061089, Longitude: 103.834304, Capacity: 10000, ContactName: "邓越", ContactPhone: "0931-68880085", WorkingHours: "06:00-22:00", Remark: "甘肃及西北走廊物资出口揽收站"},
		{StationCode: "CN-XNN-OR-01", Name: "西宁青海揽收站", Type: models.StationOrigin, Country: "中国", Province: "青海", City: "西宁", Address: "西宁市城东区昆仑路18号", Latitude: 36.617134, Longitude: 101.778228, Capacity: 8000, ContactName: "冉甜", ContactPhone: "0971-68880086", WorkingHours: "06:00-22:00", Remark: "青海地特商品出口揽收站"},
		{StationCode: "CN-YIN-OR-01", Name: "银川宁夏揽收站", Type: models.StationOrigin, Country: "中国", Province: "宁夏回族自治区", City: "银川", Address: "银川市金凤区生活路58号", Latitude: 38.487194, Longitude: 106.230909, Capacity: 9000, ContactName: "孙露", ContactPhone: "0951-68880087", WorkingHours: "06:00-22:00", Remark: "宁夏枸杞和特产跨境包裹揽收站"},
		{StationCode: "CN-URC-OR-01", Name: "乌鲁木齐新疆揽收中心", Type: models.StationOrigin, Country: "中国", Province: "新疆维吾尔自治区", City: "乌鲁木齐", Address: "乌鲁木齐市经济开发区长春路789号", Latitude: 43.825592, Longitude: 87.616848, Capacity: 12000, ContactName: "阿克娜", ContactPhone: "0991-68880088", WorkingHours: "06:00-22:00", Remark: "新疆及中亚流向货源揽收中心"},
		{StationCode: "CN-LXA-OR-01", Name: "拉萨高原揽收站", Type: models.StationOrigin, Country: "中国", Province: "西藏自治区", City: "拉萨", Address: "拉萨市城关区商贸北路128号", Latitude: 29.652491, Longitude: 91.172110, Capacity: 6000, ContactName: "达瓦", ContactPhone: "0891-68880089", WorkingHours: "08:00-20:00", Remark: "西藏地区包裹前置揽收和集货点"},
	}
}

func defaultServiceAreas(stations []stationSeed) []serviceAreaSeed {
	base := []serviceAreaSeed{
		{StationCode: "CN-SHA-OR-01", Country: "中国", Province: "江苏", Priority: 260, Remark: "华东近场覆盖"},
		{StationCode: "CN-SHA-OR-01", Country: "中国", Province: "浙江", Priority: 260, Remark: "华东近场覆盖"},
		{StationCode: "CN-SHA-OR-01", Country: "中国", Province: "安徽", Priority: 220, Remark: "华东联动覆盖"},
		{StationCode: "CN-SHA-OR-01", Country: "中国", Province: "江西", Priority: 200, Remark: "华东联动覆盖"},
		{StationCode: "CN-SZX-OR-01", Country: "中国", Province: "广西", Priority: 240, Remark: "华南联动覆盖"},
		{StationCode: "CN-SZX-OR-01", Country: "中国", Province: "海南", Priority: 220, Remark: "华南联动覆盖"},
		{StationCode: "BJ-001", Country: "中国", Province: "天津", Priority: 260, Remark: "华北近场覆盖"},
		{StationCode: "BJ-001", Country: "中国", Province: "河北", Priority: 240, Remark: "华北近场覆盖"},
	}

	seen := make(map[string]struct{}, len(base)+len(stations))
	result := make([]serviceAreaSeed, 0, len(base)+len(stations))
	addArea := func(area serviceAreaSeed) {
		key := strings.Join([]string{area.StationCode, area.Country, area.Province, area.City, area.District}, "|")
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		result = append(result, area)
	}

	for _, area := range base {
		addArea(area)
	}

	for _, station := range stations {
		if station.Type != models.StationOrigin {
			continue
		}
		if station.Country != "中国" || strings.TrimSpace(station.Province) == "" {
			continue
		}
		addArea(serviceAreaSeed{
			StationCode: station.StationCode,
			Country:     station.Country,
			Province:    station.Province,
			Priority:    500,
			Remark:      "本省默认覆盖",
		})
	}

	return result
}
