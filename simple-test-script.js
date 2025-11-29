function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'fetch') {
      // Simple test response
      const testData = [
        {
          kdo: "Test Person",
          co: "Test Gift", 
          odkaz: "https://example.com",
          status: "poslat tip"
        }
      ];
      
      const jsonData = JSON.stringify(testData);
      const callback = e.parameter.callback;
      
      // Handle JSONP callback
      if (callback) {
        return ContentService
          .createTextOutput(`${callback}(${jsonData})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      // Regular JSON response
      return ContentService
        .createTextOutput(jsonData)
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        
    } else {
      return ContentService
        .createTextOutput('ERROR: Unknown action')
        .setMimeType(ContentService.MimeType.TEXT)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    }
      
  } catch (error) {
    return ContentService
      .createTextOutput('ERROR: ' + error.toString())
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

function doPost(e) {
  return doGet(e);
}