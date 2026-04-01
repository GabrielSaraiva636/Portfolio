package com.portfolio.commerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldRequireStockReservationBeforePicking() throws Exception {
        String createPayload = """
            {
              "customer": "Cliente Teste",
              "channel": "E-commerce",
              "value": 1990.0,
              "sku": "SKU-TEST-01",
              "quantity": 3,
              "deadlineDays": 2
            }
            """;

        MvcResult createResult = mockMvc.perform(
                        post("/api/orders")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(createPayload)
                )
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdOrder = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String orderId = createdOrder.get("id").asText();

        String transitionPayload = """
            {
              "targetStatus": "PICKING",
              "reason": "Iniciar separação"
            }
            """;

        mockMvc.perform(
                        patch("/api/orders/{id}/transition", orderId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(transitionPayload)
                )
                .andExpect(status().isConflict());

        String reservePayload = """
            {
              "warehouse": "CD-01"
            }
            """;

        mockMvc.perform(
                        patch("/api/orders/{id}/reserve-stock", orderId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(reservePayload)
                )
                .andExpect(status().isOk());

        mockMvc.perform(
                        patch("/api/orders/{id}/transition", orderId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(transitionPayload)
                )
                .andExpect(status().isOk());
    }
}
