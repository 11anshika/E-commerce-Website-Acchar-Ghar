package com.achaarghar.service;

import com.achaarghar.model.ShopOrder;
import com.achaarghar.model.ShopOrder.Status;
import com.achaarghar.repo.OrderRepo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

/** Razorpay integration. With no keys configured it runs a dummy payment so you can test the whole flow. */
@Service
public class PaymentService {
    private final OrderRepo orders;
    private final String keyId, secret;

    public PaymentService(OrderRepo orders, @Value("${razorpay.key-id}") String keyId, @Value("${razorpay.key-secret}") String secret) {
        this.orders = orders; this.keyId = keyId; this.secret = secret;
    }

    private boolean mock() { return keyId.isBlank() || secret.isBlank(); }

    @SuppressWarnings("unchecked")
    public Map<String, Object> create(ShopOrder o) {
        if (o.status != Status.PENDING_PAYMENT) throw OrderService.bad("This order does not need payment");
        long paise = o.total * 100L;
        if (mock()) {
            o.razorpayOrderId = "order_mock_" + o.id;
            orders.save(o);
            return Map.of("mock", true, "keyId", "", "razorpayOrderId", o.razorpayOrderId, "amount", paise);
        }
        Map<String, Object> res = RestClient.create().post().uri("https://api.razorpay.com/v1/orders")
                .headers(h -> h.setBasicAuth(keyId, secret)).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("amount", paise, "currency", "INR", "receipt", o.orderNo))
                .retrieve().body(Map.class);
        o.razorpayOrderId = (String) res.get("id");
        orders.save(o);
        return Map.of("mock", false, "keyId", keyId, "razorpayOrderId", o.razorpayOrderId, "amount", paise);
    }

    public ShopOrder verify(ShopOrder o, String paymentId, String signature) {
        if (!mock()) {
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                String expected = HexFormat.of().formatHex(mac.doFinal((o.razorpayOrderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));
                if (signature == null || !MessageDigest.isEqual(expected.getBytes(), signature.getBytes()))
                    throw OrderService.bad("Payment could not be verified");
            } catch (java.security.GeneralSecurityException e) {
                throw new IllegalStateException(e);
            }
        }
        o.razorpayPaymentId = paymentId;
        o.paymentStatus = "PAID";
        o.status = Status.PLACED;
        return orders.save(o);
    }
}
