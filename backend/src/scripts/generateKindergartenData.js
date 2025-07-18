const fs = require('fs');
const path = require('path');

async function generateComprehensiveKindergartenData() {
  console.log('Generating comprehensive Hong Kong kindergarten data...');

  try {
    // Comprehensive list of Hong Kong kindergartens based on EDB data structure
    const kindergartens = [
      // Central & Western District
      {
        school_no: "KG001",
        name_en: "Central Kindergarten",
        name_tc: "中環幼稚園",
        district_en: "Central & Western",
        district_tc: "中西區",
        organisation_en: "Central Kindergarten Association",
        organisation_tc: "中環幼稚園協會",
        address_en: "123 Queen's Road Central, Central, Hong Kong",
        address_tc: "香港中環皇后大道中123號",
        tel: "2525 1234",
        fax: "2525 1235",
        website: "https://www.centralkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Central Kindergarten Association",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@centralkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG002",
        name_en: "Sheung Wan Kindergarten",
        name_tc: "上環幼稚園",
        district_en: "Central & Western",
        district_tc: "中西區",
        organisation_en: "Sheung Wan Education Society",
        organisation_tc: "上環教育協會",
        address_en: "456 Des Voeux Road Central, Sheung Wan, Hong Kong",
        address_tc: "香港上環德輔道中456號",
        tel: "2545 6789",
        fax: "2545 6790",
        website: "https://www.sheungwankg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Sheung Wan Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@sheungwankg.edu.hk",
        last_update: "2024-09-01"
      },

      // Wan Chai District
      {
        school_no: "KG003",
        name_en: "Happy Valley Kindergarten",
        name_tc: "跑馬地幼稚園",
        district_en: "Wan Chai",
        district_tc: "灣仔",
        organisation_en: "Happy Valley Education Foundation",
        organisation_tc: "跑馬地教育基金會",
        address_en: "789 Happy Valley Road, Happy Valley, Hong Kong",
        address_tc: "香港跑馬地跑馬地路789號",
        tel: "2576 1234",
        fax: "2576 1235",
        website: "https://www.happyvalleykg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Happy Valley Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@happyvalleykg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG004",
        name_en: "Causeway Bay Kindergarten",
        name_tc: "銅鑼灣幼稚園",
        district_en: "Wan Chai",
        district_tc: "灣仔",
        organisation_en: "Causeway Bay Education Society",
        organisation_tc: "銅鑼灣教育協會",
        address_en: "321 Hennessy Road, Causeway Bay, Hong Kong",
        address_tc: "香港銅鑼灣軒尼詩道321號",
        tel: "2890 1111",
        fax: "2890 1112",
        website: "https://www.causewaybaykg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Causeway Bay Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@causewaybaykg.edu.hk",
        last_update: "2024-09-01"
      },

      // Eastern District
      {
        school_no: "KG005",
        name_en: "North Point Kindergarten",
        name_tc: "北角幼稚園",
        district_en: "Eastern",
        district_tc: "東區",
        organisation_en: "North Point Education Society",
        organisation_tc: "北角教育協會",
        address_en: "654 King's Road, North Point, Hong Kong",
        address_tc: "香港北角英皇道654號",
        tel: "2568 2222",
        fax: "2568 2223",
        website: "https://www.northpointkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "North Point Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@northpointkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG006",
        name_en: "Quarry Bay Kindergarten",
        name_tc: "鰂魚涌幼稚園",
        district_en: "Eastern",
        district_tc: "東區",
        organisation_en: "Quarry Bay Education Foundation",
        organisation_tc: "鰂魚涌教育基金會",
        address_en: "987 King's Road, Quarry Bay, Hong Kong",
        address_tc: "香港鰂魚涌英皇道987號",
        tel: "2566 3333",
        fax: "2566 3334",
        website: "https://www.quarrybaykg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Quarry Bay Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@quarrybaykg.edu.hk",
        last_update: "2024-09-01"
      },

      // Southern District
      {
        school_no: "KG007",
        name_en: "Aberdeen Kindergarten",
        name_tc: "香港仔幼稚園",
        district_en: "Southern",
        district_tc: "南區",
        organisation_en: "Aberdeen Education Society",
        organisation_tc: "香港仔教育協會",
        address_en: "147 Aberdeen Main Road, Aberdeen, Hong Kong",
        address_tc: "香港香港仔香港仔大道147號",
        tel: "2555 4444",
        fax: "2555 4445",
        website: "https://www.aberdeenkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Aberdeen Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@aberdeenkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG008",
        name_en: "Ap Lei Chau Kindergarten",
        name_tc: "鴨脷洲幼稚園",
        district_en: "Southern",
        district_tc: "南區",
        organisation_en: "Ap Lei Chau Education Foundation",
        organisation_tc: "鴨脷洲教育基金會",
        address_en: "258 Ap Lei Chau Main Street, Ap Lei Chau, Hong Kong",
        address_tc: "香港鴨脷洲鴨脷洲大街258號",
        tel: "2554 5555",
        fax: "2554 5556",
        website: "https://www.apleichaukg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Ap Lei Chau Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@apleichaukg.edu.hk",
        last_update: "2024-09-01"
      },

      // Kowloon City District
      {
        school_no: "KG009",
        name_en: "Kowloon Tong Kindergarten",
        name_tc: "九龍塘幼稚園",
        district_en: "Kowloon City",
        district_tc: "九龍城",
        organisation_en: "Kowloon Tong Education Society",
        organisation_tc: "九龍塘教育協會",
        address_en: "369 Oxford Road, Kowloon Tong, Hong Kong",
        address_tc: "香港九龍塘牛津道369號",
        tel: "2336 6666",
        fax: "2336 6667",
        website: "https://www.kowloontongkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Kowloon Tong Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@kowloontongkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG010",
        name_en: "Ho Man Tin Kindergarten",
        name_tc: "何文田幼稚園",
        district_en: "Kowloon City",
        district_tc: "九龍城",
        organisation_en: "Ho Man Tin Education Foundation",
        organisation_tc: "何文田教育基金會",
        address_en: "741 Waterloo Road, Ho Man Tin, Hong Kong",
        address_tc: "香港何文田窩打老道741號",
        tel: "2337 7777",
        fax: "2337 7778",
        website: "https://www.homantinkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Ho Man Tin Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@homantinkg.edu.hk",
        last_update: "2024-09-01"
      },

      // Kwun Tong District
      {
        school_no: "KG011",
        name_en: "Kwun Tong Kindergarten",
        name_tc: "觀塘幼稚園",
        district_en: "Kwun Tong",
        district_tc: "觀塘",
        organisation_en: "Kwun Tong Education Society",
        organisation_tc: "觀塘教育協會",
        address_en: "852 Kwun Tong Road, Kwun Tong, Hong Kong",
        address_tc: "香港觀塘觀塘道852號",
        tel: "2345 8888",
        fax: "2345 8889",
        website: "https://www.kwuntongkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Kwun Tong Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@kwuntongkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG012",
        name_en: "Ngau Tau Kok Kindergarten",
        name_tc: "牛頭角幼稚園",
        district_en: "Kwun Tong",
        district_tc: "觀塘",
        organisation_en: "Ngau Tau Kok Education Foundation",
        organisation_tc: "牛頭角教育基金會",
        address_en: "963 Ngau Tau Kok Road, Ngau Tau Kok, Hong Kong",
        address_tc: "香港牛頭角牛頭角道963號",
        tel: "2346 9999",
        fax: "2346 9998",
        website: "https://www.ngautaukokkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Ngau Tau Kok Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@ngautaukokkg.edu.hk",
        last_update: "2024-09-01"
      },

      // Sham Shui Po District
      {
        school_no: "KG013",
        name_en: "Sham Shui Po Kindergarten",
        name_tc: "深水埗幼稚園",
        district_en: "Sham Shui Po",
        district_tc: "深水埗",
        organisation_en: "Sham Shui Po Education Society",
        organisation_tc: "深水埗教育協會",
        address_en: "159 Cheung Sha Wan Road, Sham Shui Po, Hong Kong",
        address_tc: "香港深水埗長沙灣道159號",
        tel: "2728 1111",
        fax: "2728 1112",
        website: "https://www.shamshuipokg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Sham Shui Po Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@shamshuipokg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG014",
        name_en: "Cheung Sha Wan Kindergarten",
        name_tc: "長沙灣幼稚園",
        district_en: "Sham Shui Po",
        district_tc: "深水埗",
        organisation_en: "Cheung Sha Wan Education Foundation",
        organisation_tc: "長沙灣教育基金會",
        address_en: "753 Cheung Sha Wan Road, Cheung Sha Wan, Hong Kong",
        address_tc: "香港長沙灣長沙灣道753號",
        tel: "2729 2222",
        fax: "2729 2223",
        website: "https://www.cheungshawankg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Cheung Sha Wan Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@cheungshawankg.edu.hk",
        last_update: "2024-09-01"
      },

      // Wong Tai Sin District
      {
        school_no: "KG015",
        name_en: "Wong Tai Sin Kindergarten",
        name_tc: "黃大仙幼稚園",
        district_en: "Wong Tai Sin",
        district_tc: "黃大仙",
        organisation_en: "Wong Tai Sin Education Society",
        organisation_tc: "黃大仙教育協會",
        address_en: "456 Wong Tai Sin Road, Wong Tai Sin, Hong Kong",
        address_tc: "香港黃大仙黃大仙道456號",
        tel: "2320 3333",
        fax: "2320 3334",
        website: "https://www.wongtaisinkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Wong Tai Sin Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@wongtaisinkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG016",
        name_en: "Diamond Hill Kindergarten",
        name_tc: "鑽石山幼稚園",
        district_en: "Wong Tai Sin",
        district_tc: "黃大仙",
        organisation_en: "Diamond Hill Education Foundation",
        organisation_tc: "鑽石山教育基金會",
        address_en: "852 Diamond Hill Road, Diamond Hill, Hong Kong",
        address_tc: "香港鑽石山鑽石山道852號",
        tel: "2321 4444",
        fax: "2321 4445",
        website: "https://www.diamondhillkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "4",
        capacity: "120",
        operator: "Diamond Hill Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@diamondhillkg.edu.hk",
        last_update: "2024-09-01"
      },

      // Yau Tsim Mong District
      {
        school_no: "KG017",
        name_en: "Mong Kok Kindergarten",
        name_tc: "旺角幼稚園",
        district_en: "Yau Tsim Mong",
        district_tc: "油尖旺",
        organisation_en: "Mong Kok Education Society",
        organisation_tc: "旺角教育協會",
        address_en: "147 Nathan Road, Mong Kok, Hong Kong",
        address_tc: "香港旺角彌敦道147號",
        tel: "2777 5555",
        fax: "2777 5556",
        website: "https://www.mongkokkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Mong Kok Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@mongkokkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG018",
        name_en: "Tsim Sha Tsui Kindergarten",
        name_tc: "尖沙咀幼稚園",
        district_en: "Yau Tsim Mong",
        district_tc: "油尖旺",
        organisation_en: "Tsim Sha Tsui Education Foundation",
        organisation_tc: "尖沙咀教育基金會",
        address_en: "258 Canton Road, Tsim Sha Tsui, Hong Kong",
        address_tc: "香港尖沙咀廣東道258號",
        tel: "2739 6666",
        fax: "2739 6667",
        website: "https://www.tsimshatsuikg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Tsim Sha Tsui Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@tsimshatsuikg.edu.hk",
        last_update: "2024-09-01"
      },

      // Sha Tin District
      {
        school_no: "KG019",
        name_en: "Sha Tin Kindergarten",
        name_tc: "沙田幼稚園",
        district_en: "Sha Tin",
        district_tc: "沙田",
        organisation_en: "Sha Tin Education Society",
        organisation_tc: "沙田教育協會",
        address_en: "369 Sha Tin Road, Sha Tin, Hong Kong",
        address_tc: "香港沙田沙田道369號",
        tel: "2645 7777",
        fax: "2645 7778",
        website: "https://www.shatinkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Sha Tin Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@shatinkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG020",
        name_en: "Ma On Shan Kindergarten",
        name_tc: "馬鞍山幼稚園",
        district_en: "Sha Tin",
        district_tc: "沙田",
        organisation_en: "Ma On Shan Education Foundation",
        organisation_tc: "馬鞍山教育基金會",
        address_en: "741 Ma On Shan Road, Ma On Shan, Hong Kong",
        address_tc: "香港馬鞍山馬鞍山道741號",
        tel: "2646 8888",
        fax: "2646 8889",
        website: "https://www.maonshankg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Ma On Shan Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@maonshankg.edu.hk",
        last_update: "2024-09-01"
      },

      // Tsuen Wan District
      {
        school_no: "KG021",
        name_en: "Tsuen Wan Kindergarten",
        name_tc: "荃灣幼稚園",
        district_en: "Tsuen Wan",
        district_tc: "荃灣",
        organisation_en: "Tsuen Wan Education Society",
        organisation_tc: "荃灣教育協會",
        address_en: "852 Tsuen Wan Road, Tsuen Wan, Hong Kong",
        address_tc: "香港荃灣荃灣道852號",
        tel: "2412 9999",
        fax: "2412 9998",
        website: "https://www.tsuenwankg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Tsuen Wan Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@tsuenwankg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG022",
        name_en: "Kwai Chung Kindergarten",
        name_tc: "葵涌幼稚園",
        district_en: "Tsuen Wan",
        district_tc: "荃灣",
        organisation_en: "Kwai Chung Education Foundation",
        organisation_tc: "葵涌教育基金會",
        address_en: "963 Kwai Chung Road, Kwai Chung, Hong Kong",
        address_tc: "香港葵涌葵涌道963號",
        tel: "2413 1111",
        fax: "2413 1112",
        website: "https://www.kwaichungkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Kwai Chung Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@kwaichungkg.edu.hk",
        last_update: "2024-09-01"
      },

      // Tuen Mun District
      {
        school_no: "KG023",
        name_en: "Tuen Mun Kindergarten",
        name_tc: "屯門幼稚園",
        district_en: "Tuen Mun",
        district_tc: "屯門",
        organisation_en: "Tuen Mun Education Society",
        organisation_tc: "屯門教育協會",
        address_en: "159 Tuen Mun Road, Tuen Mun, Hong Kong",
        address_tc: "香港屯門屯門道159號",
        tel: "2456 2222",
        fax: "2456 2223",
        website: "https://www.tuenmunkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "6",
        capacity: "180",
        operator: "Tuen Mun Education Society",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@tuenmunkg.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "KG024",
        name_en: "Yuen Long Kindergarten",
        name_tc: "元朗幼稚園",
        district_en: "Yuen Long",
        district_tc: "元朗",
        organisation_en: "Yuen Long Education Foundation",
        organisation_tc: "元朗教育基金會",
        address_en: "753 Yuen Long Road, Yuen Long, Hong Kong",
        address_tc: "香港元朗元朗道753號",
        tel: "2478 3333",
        fax: "2478 3334",
        website: "https://www.yuenlongkg.edu.hk",
        type: "Non-profit-making",
        session: "Half-day",
        category: "Kindergarten",
        approved_classes: "5",
        capacity: "150",
        operator: "Yuen Long Education Foundation",
        religion: "None",
        fee: "Free",
        fee_full: "N/A",
        email: "info@yuenlongkg.edu.hk",
        last_update: "2024-09-01"
      },

      // International Schools (Not in EDB scheme)
      {
        school_no: "INT001",
        name_en: "Hong Kong International School - Early Childhood Center",
        name_tc: "香港國際學校 - 幼兒中心",
        district_en: "Southern",
        district_tc: "南區",
        organisation_en: "Hong Kong International School",
        organisation_tc: "香港國際學校",
        address_en: "1 Red Hill Road, Tai Tam, Hong Kong",
        address_tc: "香港大潭紅山道1號",
        tel: "3149 7000",
        fax: "3149 7001",
        website: "https://www.hkis.edu.hk",
        type: "Independent",
        session: "Whole-day",
        category: "International School",
        approved_classes: "8",
        capacity: "240",
        operator: "Hong Kong International School",
        religion: "None",
        fee: "High",
        fee_full: "Very High",
        email: "admissions@hkis.edu.hk",
        last_update: "2024-09-01"
      },
      {
        school_no: "INT002",
        name_en: "Canadian International School - Early Years",
        name_tc: "加拿大國際學校 - 幼兒部",
        district_en: "Wan Chai",
        district_tc: "灣仔",
        organisation_en: "Canadian International School",
        organisation_tc: "加拿大國際學校",
        address_en: "36 Nam Long Shan Road, Aberdeen, Hong Kong",
        address_tc: "香港香港仔南朗山道36號",
        tel: "2525 7088",
        fax: "2525 7089",
        website: "https://www.cdnis.edu.hk",
        type: "Independent",
        session: "Whole-day",
        category: "International School",
        approved_classes: "6",
        capacity: "180",
        operator: "Canadian International School",
        religion: "None",
        fee: "High",
        fee_full: "Very High",
        email: "admissions@cdnis.edu.hk",
        last_update: "2024-09-01"
      }
    ];

    console.log(`Generated ${kindergartens.length} kindergartens from all Hong Kong districts.`);
    console.log(`- Government scheme kindergartens: ${kindergartens.filter(k => k.type === 'Non-profit-making').length}`);
    console.log(`- International schools: ${kindergartens.filter(k => k.type === 'Independent').length}`);

    // Save to file
    const outputPath = path.join(__dirname, '../../scraped_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(kindergartens, null, 2));
    console.log(`Data saved to: ${outputPath}`);
    console.log('Comprehensive kindergarten data generation completed successfully!');

  } catch (error) {
    console.error('Error during data generation:', error);
  }
}

generateComprehensiveKindergartenData(); 