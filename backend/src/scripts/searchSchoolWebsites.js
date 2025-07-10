const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class SchoolWebsiteSearcher {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.searchEngines = [
      'https://www.google.com/search',
      'https://www.bing.com/search'
    ];
    this.knownSchoolDomains = [
      'edu.hk',
      'school.hk',
      'kg.edu.hk',
      'kindergarten.edu.hk',
      'nursery.edu.hk'
    ];
  }

  // Search for school website using multiple methods
  async searchSchoolWebsite(schoolName, schoolNo) {
    console.log(`Searching for website: ${schoolName} (${schoolNo})`);
    
    const searchResults = [];
    
    // Method 1: Direct domain search
    const directResults = await this.searchDirectDomains(schoolName, schoolNo);
    searchResults.push(...directResults);
    
    // Method 2: Google search
    const googleResults = await this.searchGoogle(schoolName, schoolNo);
    searchResults.push(...googleResults);
    
    // Method 3: Bing search
    const bingResults = await this.searchBing(schoolName, schoolNo);
    searchResults.push(...bingResults);
    
    // Method 4: EDB website search
    const edbResults = await this.searchEDBWebsite(schoolName, schoolNo);
    searchResults.push(...edbResults);
    
    // Filter and rank results
    const rankedResults = this.rankResults(searchResults, schoolName);
    
    return rankedResults.length > 0 ? rankedResults[0] : null;
  }

  // Search for common school domain patterns
  async searchDirectDomains(schoolName, schoolNo) {
    const results = [];
    const searchTerms = [
      schoolName,
      schoolName.replace(/[^a-zA-Z0-9]/g, ''),
      schoolNo,
      schoolName.split(' ')[0] // First word
    ];

    for (const term of searchTerms) {
      for (const domain of this.knownSchoolDomains) {
        const url = `https://www.${term.toLowerCase()}.${domain}`;
        try {
          const response = await axios.get(url, {
            headers: { 'User-Agent': this.userAgent },
            timeout: 5000,
            validateStatus: () => true
          });
          
          if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const title = $('title').text().toLowerCase();
            const bodyText = $('body').text().toLowerCase();
            
            // Check if it's likely a school website
            if (this.isSchoolWebsite(title, bodyText, schoolName)) {
              results.push({
                url,
                confidence: 0.8,
                source: 'direct_domain',
                title: title
              });
            }
          }
        } catch (error) {
          // Domain doesn't exist or is unreachable
        }
      }
    }
    
    return results;
  }

  // Search Google for school website
  async searchGoogle(schoolName, schoolNo) {
    const results = [];
    const searchQueries = [
      `"${schoolName}" "Hong Kong" website`,
      `"${schoolName}" kindergarten website`,
      `"${schoolName}" ${schoolNo} website`,
      `"${schoolName}" 幼稚園 網站`
    ];

    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://www.google.com/search', {
          params: {
            q: query,
            num: 5
          },
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const links = $('a[href^="http"]');
        
        links.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text();
          
          if (href && this.isValidSchoolUrl(href, schoolName)) {
            results.push({
              url: href,
              confidence: 0.6,
              source: 'google',
              title: text
            });
          }
        });
      } catch (error) {
        console.log(`Google search failed for ${schoolName}:`, error.message);
      }
    }
    
    return results;
  }

  // Search Bing for school website
  async searchBing(schoolName, schoolNo) {
    const results = [];
    const searchQueries = [
      `"${schoolName}" "Hong Kong" website`,
      `"${schoolName}" kindergarten website`,
      `"${schoolName}" ${schoolNo} website`
    ];

    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://www.bing.com/search', {
          params: {
            q: query,
            count: 5
          },
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const links = $('a[href^="http"]');
        
        links.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text();
          
          if (href && this.isValidSchoolUrl(href, schoolName)) {
            results.push({
              url: href,
              confidence: 0.5,
              source: 'bing',
              title: text
            });
          }
        });
      } catch (error) {
        console.log(`Bing search failed for ${schoolName}:`, error.message);
      }
    }
    
    return results;
  }

  // Search EDB (Education Bureau) website for school information
  async searchEDBWebsite(schoolName, schoolNo) {
    const results = [];
    
    try {
      // EDB school search URL
      const edbUrl = `https://www.edb.gov.hk/en/edu-system/preprimary-kindergarten/quality-assurance-framework/qrkg/index.html`;
      
      const response = await axios.get(edbUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Look for school links that might contain website information
      const schoolLinks = $('a[href*="school"], a[href*="kg"], a[href*="kindergarten"]');
      
      schoolLinks.each((i, link) => {
        const href = $(link).attr('href');
        const text = $(link).text();
        
        if (href && text.toLowerCase().includes(schoolName.toLowerCase())) {
          results.push({
            url: href.startsWith('http') ? href : `https://www.edb.gov.hk${href}`,
            confidence: 0.7,
            source: 'edb',
            title: text
          });
        }
      });
    } catch (error) {
      console.log(`EDB search failed for ${schoolName}:`, error.message);
    }
    
    return results;
  }

  // Check if a URL is likely a school website
  isValidSchoolUrl(url, schoolName) {
    const urlLower = url.toLowerCase();
    const schoolNameLower = schoolName.toLowerCase();
    
    // Exclude common non-school domains
    const excludeDomains = [
      'google.com', 'bing.com', 'facebook.com', 'youtube.com',
      'wikipedia.org', 'linkedin.com', 'twitter.com', 'instagram.com'
    ];
    
    if (excludeDomains.some(domain => urlLower.includes(domain))) {
      return false;
    }
    
    // Check if URL contains school-related keywords
    const schoolKeywords = ['school', 'kg', 'kindergarten', 'nursery', 'education'];
    const hasSchoolKeyword = schoolKeywords.some(keyword => urlLower.includes(keyword));
    
    // Check if URL contains school name (partial match)
    const schoolWords = schoolNameLower.split(' ').filter(word => word.length > 2);
    const hasSchoolName = schoolWords.some(word => urlLower.includes(word));
    
    return hasSchoolKeyword || hasSchoolName;
  }

  // Check if website content is likely a school website
  isSchoolWebsite(title, bodyText, schoolName) {
    const schoolKeywords = [
      'kindergarten', 'nursery', 'school', 'education', 'learning',
      '幼稚園', '幼兒園', '學校', '教育'
    ];
    
    const hasSchoolKeywords = schoolKeywords.some(keyword => 
      title.includes(keyword) || bodyText.includes(keyword)
    );
    
    const schoolNameWords = schoolName.toLowerCase().split(' ').filter(word => word.length > 2);
    const hasSchoolName = schoolNameWords.some(word => 
      title.includes(word) || bodyText.includes(word)
    );
    
    return hasSchoolKeywords && hasSchoolName;
  }

  // Rank search results by confidence
  rankResults(results, schoolName) {
    return results
      .filter(result => result.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      ); // Remove duplicates
  }

  // Main function to search websites for all schools
  async searchAllSchoolWebsites() {
    try {
      // Load existing kindergarten data
      const dataPath = path.join(__dirname, '..', '..', 'scraped_data.json');
      const kindergartens = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      
      console.log(`Starting website search for ${kindergartens.length} schools...`);
      
      const results = [];
      const batchSize = 10; // Process in batches to avoid rate limiting
      
      for (let i = 0; i < kindergartens.length; i += batchSize) {
        const batch = kindergartens.slice(i, i + batchSize);
        
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(kindergartens.length/batchSize)}`);
        
        for (const school of batch) {
          try {
            const website = await this.searchSchoolWebsite(school.name_en, school.school_no);
            
            if (website) {
              results.push({
                school_no: school.school_no,
                name_en: school.name_en,
                name_tc: school.name_tc,
                website_url: website.url,
                confidence: website.confidence,
                source: website.source,
                search_date: new Date().toISOString()
              });
              
              console.log(`✓ Found website for ${school.name_en}: ${website.url}`);
            } else {
              console.log(`✗ No website found for ${school.name_en}`);
            }
            
            // Add delay between searches to be respectful
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            console.error(`Error searching for ${school.name_en}:`, error.message);
          }
        }
        
        // Longer delay between batches
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Save results
      const outputPath = path.join(__dirname, '..', '..', 'school_websites.json');
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      
      console.log(`\nWebsite search completed!`);
      console.log(`Found websites for ${results.length} out of ${kindergartens.length} schools`);
      console.log(`Results saved to: ${outputPath}`);
      
      return results;
      
    } catch (error) {
      console.error('Error in website search:', error);
      throw error;
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  const searcher = new SchoolWebsiteSearcher();
  searcher.searchAllSchoolWebsites()
    .then(results => {
      console.log('Website search completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Website search failed:', error);
      process.exit(1);
    });
}

module.exports = SchoolWebsiteSearcher; 