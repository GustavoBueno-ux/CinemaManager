async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(
            `${API_URL}${endpoint}`,
            options
        );


        const data = await response.json();


        return {
            ok: response.ok,
            status: response.status,
            data
        };


    } catch(error) {

        return {
            ok:false,
            error:true,
            data:null
        };

    }

}