(async () => {
    try {
        const res = await fetch('https://www.animedbs.online');
        const text = await res.text();
        
        // Match episode links
        const hrefs = text.match(/href="([^"]+)"/g) || [];
        const eps = hrefs.filter(h => h.includes('episodio') || h.includes('ver/')).map(h => h.split('"')[1]).slice(0, 5);
        console.log('Episodios encontrados:', eps);
        
        if (eps.length > 0) {
            console.log('Visitando:', eps[0]);
            const epRes = await fetch(eps[0]);
            const epText = await epRes.text();
            
            // Check for servers
            console.log('Scripts:', epText.match(/<script/g)?.length);
            console.log('Iframes:', epText.match(/<iframe[^>]+src="([^"]+)"/g));
            console.log('Options:', epText.match(/<li[^>]*>.*?<\/li>/g)?.slice(0, 5));
        }
    } catch(e) {
        console.log(e);
    }
})();
