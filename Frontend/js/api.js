async function apiRequest(endpoint, options = {}) {

    try {

        const token = localStorage.getItem("token");

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );

        let data = null;

        const contentType =
            response.headers.get("content-type");

        if (
            contentType &&
            contentType.includes("application/json")
        ) {
            data = await response.json();
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };

    } catch (error) {

        console.error("Erro ao acessar a API:", error);

        return {
            ok: false,
            status: 0,
            error: true,
            data: null
        };

    }

}