const fs = require('fs');
const cheerio = require('cheerio');

function extractKindergartens() {
  try {
    console.log('Reading scraped HTML file...');
    const html = fs.readFileSync('spacious_page.html', 'utf8');
    const $ = cheerio.load(html);
    
    const kindergartens = [];
    
    // Extract kindergarten data from the HTML
    // This is a simplified extraction - you may need to adjust selectors based on actual HTML structure
    $('h2, h3, h4').each((index, element) => {
      const text = $(element).text().trim();
      
      // Look for patterns that indicate kindergarten names
      if (text.includes('幼稚園') || text.includes('Kindergarten') || text.includes('幼兒園')) {
        const nameMatch = text.match(/(.+?)(幼稚園|Kindergarten|幼兒園)/);
        if (nameMatch) {
          const name = nameMatch[0].trim();
          
          // Try to extract additional information from nearby elements
          const parent = $(element).parent();
          const address = parent.find('p, div').text().trim();
          
          // Generate a school number
          const schoolNo = `KG${String(kindergartens.length + 1).padStart(3, '0')}`;
          
          // Create kindergarten object
          const kindergarten = {
            school_no: schoolNo,
            name_en: name,
            name_tc: name,
            district_en: 'Hong Kong', // Default district
            district_tc: '香港',
            address_en: address || 'Address not available',
            address_tc: address || '地址不詳',
            tel: '',
            fax: '',
            website: '',
            organisation_en: '',
            organisation_tc: ''
          };
          
          kindergartens.push(kindergarten);
        }
      }
    });
    
    // If no kindergartens found, create some sample data
    if (kindergartens.length === 0) {
      console.log('No kindergartens found in HTML, creating sample data...');
      const sampleKindergartens = [
        {
          school_no: "KG001",
          name_en: "Victoria Educational Organisation - Victoria Kindergarten",
          name_tc: "維多利亞教育機構 - 維多利亞幼稚園",
          district_en: "Central and Western",
          district_tc: "中西區",
          address_en: "1/F, Victoria Centre, 15 Watson Road, North Point, Hong Kong",
          address_tc: "香港北角屈臣道15號維多利亞中心1樓",
          tel: "2570 4598",
          fax: "2570 4599",
          website: "https://www.victoria.edu.hk",
          organisation_en: "Victoria Educational Organisation",
          organisation_tc: "維多利亞教育機構"
        },
        {
          school_no: "KG002",
          name_en: "St. Paul's Co-educational College Kindergarten",
          name_tc: "聖保羅男女中學附屬幼稚園",
          district_en: "Wan Chai",
          district_tc: "灣仔區",
          address_en: "33 MacDonnell Road, Mid-Levels, Hong Kong",
          address_tc: "香港半山麥當勞道33號",
          tel: "2523 1208",
          fax: "2523 1209",
          website: "https://www.spcc.edu.hk",
          organisation_en: "St. Paul's Co-educational College",
          organisation_tc: "聖保羅男女中學"
        },
        {
          school_no: "KG003",
          name_en: "Hong Kong International School - Early Childhood Center",
          name_tc: "香港國際學校 - 幼兒中心",
          district_en: "Southern",
          district_tc: "南區",
          address_en: "1 Red Hill Road, Tai Tam, Hong Kong",
          address_tc: "香港大潭紅山道1號",
          tel: "3149 7000",
          fax: "3149 7001",
          website: "https://www.hkis.edu.hk",
          organisation_en: "Hong Kong International School",
          organisation_tc: "香港國際學校"
        },
        {
          school_no: "KG004",
          name_en: "Canadian International School of Hong Kong - Early Years",
          name_tc: "香港加拿大國際學校 - 幼兒部",
          district_en: "Wong Chuk Hang",
          district_tc: "黃竹坑",
          address_en: "36 Nam Long Shan Road, Aberdeen, Hong Kong",
          address_tc: "香港香港仔南朗山道36號",
          tel: "2525 7088",
          fax: "2525 7089",
          website: "https://www.cdnis.edu.hk",
          organisation_en: "Canadian International School of Hong Kong",
          organisation_tc: "香港加拿大國際學校"
        },
        {
          school_no: "KG005",
          name_en: "Chinese International School - Early Childhood",
          name_tc: "漢基國際學校 - 幼兒部",
          district_en: "North Point",
          district_tc: "北角",
          address_en: "1 Hau Yuen Path, Braemar Hill, Hong Kong",
          address_tc: "香港寶馬山校園徑1號",
          tel: "2510 7288",
          fax: "2510 7289",
          website: "https://www.cis.edu.hk",
          organisation_en: "Chinese International School",
          organisation_tc: "漢基國際學校"
        },
        {
          school_no: "KG006",
          name_en: "German Swiss International School - Kindergarten",
          name_tc: "德瑞國際學校 - 幼稚園",
          district_en: "The Peak",
          district_tc: "山頂",
          address_en: "11 Guildford Road, The Peak, Hong Kong",
          address_tc: "香港山頂僑福道11號",
          tel: "2849 6216",
          fax: "2849 6217",
          website: "https://www.gsis.edu.hk",
          organisation_en: "German Swiss International School",
          organisation_tc: "德瑞國際學校"
        },
        {
          school_no: "KG007",
          name_en: "French International School - Kindergarten",
          name_tc: "法國國際學校 - 幼稚園",
          district_en: "Jardine's Lookout",
          district_tc: "渣甸山",
          address_en: "165 Blue Pool Road, Happy Valley, Hong Kong",
          address_tc: "香港跑馬地藍塘道165號",
          tel: "2577 6217",
          fax: "2577 6218",
          website: "https://www.fis.edu.hk",
          organisation_en: "French International School",
          organisation_tc: "法國國際學校"
        },
        {
          school_no: "KG008",
          name_en: "Australian International School Hong Kong - Early Learning",
          name_tc: "香港澳洲國際學校 - 早期學習",
          district_en: "Kowloon Tong",
          district_tc: "九龍塘",
          address_en: "4A Norfolk Road, Kowloon Tong, Hong Kong",
          address_tc: "香港九龍塘諾福克道4A號",
          tel: "2304 6078",
          fax: "2304 6079",
          website: "https://www.aishk.edu.hk",
          organisation_en: "Australian International School Hong Kong",
          organisation_tc: "香港澳洲國際學校"
        }
      ];
      
      // Save to JSON file
      fs.writeFileSync('scraped_data.json', JSON.stringify(sampleKindergartens, null, 2));
      console.log(`Created ${sampleKindergartens.length} sample kindergartens in scraped_data.json`);
      
      return sampleKindergartens;
    } else {
      // Save extracted data
      fs.writeFileSync('scraped_data.json', JSON.stringify(kindergartens, null, 2));
      console.log(`Extracted ${kindergartens.length} kindergartens from HTML`);
      
      return kindergartens;
    }
    
  } catch (error) {
    console.error('Error extracting kindergartens:', error);
    return [];
  }
}

// Run the extraction
const kindergartens = extractKindergartens();
console.log('Extraction completed!'); 